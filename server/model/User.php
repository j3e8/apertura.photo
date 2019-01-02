<?php
require_once "lib/stripe-php-3.14.1/init.php";

class User {
  static function create_user_from_invitation($email, $username, $password, $password2, $invitationToken) {
    $invitationId = User::get_invitation_id($invitationToken);
    if (!$invitationId) {
      throw new Exception("You weren't invited!");
    }

    if ($password != $password2) {
      throw new Exception("Passwords don't match. Can't create user account");
    }

    $newUserId = User::create_user($email, $username, $password, null);
    $sql = "INSERT into userSubscriptions (userId, subscriptionType, period, price, subscriptionEnd)
      values($newUserId, 'unlimited', 1, 0, DATE_ADD(NOW(), INTERVAL 1 YEAR))";
    db_query($sql);

    $sql = "UPDATE userInvitations SET recipientUserId=$newUserId
      where id=$invitationId";
    db_query($sql);
    return true;
  }

  static function email_is_available($email) {
    $email = db_escape($email);
    $sql = "SELECT id FROM users where email='$email'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row)
      return false;
    return true;
  }

  static function get_email_for_invitation($invitationToken) {
    $invitationToken = db_escape($invitationToken);
    $sql = "SELECT recipientEmail from userInvitations
      where invitationToken='$invitationToken'
      and recipientUserId IS NULL";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      return $row['recipientEmail'];
    }
  }

  static function get_email_from_session() {
    $email = $_SESSION['email'];
    if (!$email)
      $email = $_COOKIE['email'];
    if (!$email) {
      throw new Exception("Unauthorized access", 401);
    }
    return $email;
  }

  static function get_subscription_info($userId) {
    if ($userId != $_SESSION['userid']) {
      throw new Exception("Unauthorized user access");
    }

    $subscriptionInfo = [];
    $sql = "SELECT subscriptionStart, subscriptionEnd, p.dueDate as nextBillDate, subscriptionType, period, p.price, p.cardToken, totalAllowedFileSize, customerId
      FROM userSubscriptions as us
      INNER JOIN users as u on us.userId=u.id
      LEFT JOIN subscriptionPayments as p ON us.id=p.subscriptionId and p.dueDate > NOW() and p.status='pending'
      WHERE userId=$userId
      and us.status='active'
      and us.subscriptionEnd > NOW()
      order by p.dueDate DESC, us.subscriptionEnd DESC
      LIMIT 1";
    $result = db_query($sql);
    if ($row = db_fetch_assoc($result)) {
      $subscriptionInfo = $row;
    }

    $usageInfo = [];
    $sql = "select count(pf.id) as totalPhotoFiles, sum(totalFileSize) as totalFileSize
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'";
    $result = db_query($sql);
    if ($row = db_fetch_assoc($result)) {
      $usageInfo = $row;
    }

    $billing = null;
    if ($subscriptionInfo['customerId']) {
      \Stripe\Stripe::setApiKey(STRIPE_LIVE_PK);
      $customer = \Stripe\Customer::retrieve($subscriptionInfo['customerId']);
      $card = $customer->sources->retrieve($subscriptionInfo['cardToken']);
      $billing = array(
        'brand' => $card->brand,
        'last4' => $card->last4
      );
    }

    return array('usage' => $usageInfo, 'subscription' => $subscriptionInfo, 'billing' => $billing);
  }

  static function get_recent_downloads() {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $users = [];
    $sql = "SELECT u.id, u.username, u.email, u.firstName, u.lastName, u.dateJoined, f.filename, f.dateDownloaded
      FROM users as u
      inner join filesDownloaded as f on u.id=f.userId
      order by f.dateDownloaded DESC
      limit 10";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $users[] = $row;
    }
    return $users;
  }

  static function get_recent_uploads() {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $uploads = [];
    $sql = "SELECT u.id, u.username, u.email, u.firstName, u.lastName, pf.originalFilename, pf.dateUploaded, p.dateTaken
      FROM photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      inner join users as u on p.userId=u.id
      order by pf.dateUploaded DESC
      limit 50";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $uploads[] = $row;
    }
    return $uploads;
  }

  static function get_recent_users() {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $users = [];
    $sql = "SELECT u.id, u.firstName, u.lastName, u.email, u.username, u.dateJoined, us.subscriptionType, us.subscriptionStart, us.status
      FROM users as u
      left join userSubscriptions as us on u.id=us.userId and us.status='active' and us.subscriptionStart <= NOW() and us.subscriptionEnd > NOW()
      where u.status='active'
      order by u.dateJoined desc limit 50";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $users[] = $row;
    }
    return $users;
  }

  static function get_usage_by_user() {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $users = [];
    $sql = "SELECT p.userId, u.id, u.firstName, u.lastName, u.email, u.username, count(*) numPhotos, sum(totalFileSize)/1000000000 as storageUsed
      FROM photos as p
      inner join users as u on p.userId=u.id
      inner join photoFiles as pf on p.id=pf.photoId
      where p.status='active'
      and pf.status='active'
      group by p.userId order by numPhotos DESC limit 50";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $users[] = $row;
    }
    return $users;
  }

  static function get_user_from_upload_token($uploadToken) {
    $sql = "SELECT userId from userUploadTokens
      where token='$uploadToken'";
    $result = db_query($sql);
    if ($row = db_fetch_assoc($result)) {
      return $row['userId'];
    }
    return null;
  }

  static function get_user_id_from_session() {
    $userId = $_SESSION['userid'];
    if (!$userId) {
      $userId = $_COOKIE['userid'];
    }
    return $userId;
  }

  static function get_user_info($userId) {
    $sessionUserId = User::get_user_id_from_session();
    if ($userId != $sessionUserId && !User::is_user_admin($sessionUserId)) {
      throw new Exception("Unauthorized user access");
    }

    $userInfo = [];
    $sql = "SELECT email, username, firstName, lastName, dateJoined
      from users
      where id=$userId";
    $result = db_query($sql);
    if ($row = db_fetch_assoc($result)) {
      $userInfo = $row;
    }
    if ($userInfo['username'] == '') {
      $userInfo['username'] = $userInfo['email'];
    }
    return $userInfo;
  }

  static function is_user_admin($userId) {
    // TODO: this is super chintzy
    if ($userId == 1) {
      return true;
    }
    return false;
  }

  static function is_user_signed_in() {
    $isSignedIn = false;
    $userId = $_SESSION['userid'];
    if (!$userId)
      $userId = $_COOKIE['userid'];
    if ($userId) {
      $isSignedIn = true;
    }
    return $isSignedIn;
  }

  static function is_user_suspended($userId = null) {
    if ($userId != null) {
      $userId = db_escape($userId);
      $sql = "SELECT status FROM users where id=$userId";
      $result = db_query($sql);
      $row = db_fetch_assoc($result);
      if ($row['status'] == 'suspended') {
        return true;
      }
    }
    else if (User::is_user_signed_in()) {
      if ($_SESSION['status'] == 'suspended') {
        return true;
      }
    }
    return false;
  }

  static function reset_password($email, $password, $password2, $token) {
    $_email = db_escape($email);
    $token = db_escape($token);
    if ($password != $password2) {
      throw new Exception("Passwords don't match", 401);
    }
    $sql = "SELECT u.id, u.username, u.email from users as u
      inner join userPasswordReset as upr on u.id=upr.userId
      where u.email='$_email'
      and upr.token='$token'
      and upr.status='active'
      and upr.dateForgotten >= NOW() - 24*60*60";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      $userId = $row['id'];
      $username = $row['username'];
    }

    if ($userId) {
      $_password = md5($password);
      $sql = "UPDATE users set password='$_password' where id=$userId and email='$_email'";
      db_query($sql);
      $sql = "UPDATE userPasswordReset SET status='deleted' where userId=$userId";
      db_query($sql);
      return User::signin($username, $email, $password);
    }
    throw new Exception("Invalid email address or token.", 401);
  }

  static function send_forgot_password_email($email) {
    $email = db_escape($email);
    $sql = "select id from users where email='$email'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      $userId = $row['id'];
    }

    if ($userId) {
      $sql = "update userPasswordReset
        set status='deleted'
        where userId=$userId
        and status='active'
        and dateForgotten >= NOW() - 24*60*60";
      db_query($sql);

      $randomToken = User::create_random_token(32);
      $sql = "insert into userPasswordReset (userId, email, token) values($userId, '$email', '$randomToken')";
      db_query($sql);

      $resetLink = "https://" . SITE_ROOT . "/forgot-password?token=$randomToken";

      $message = "You mentioned that you forgot your password for Apertura. We can help with that! Follow the link below to reset your password. ";
      $message .= "This link will only be valid for 24 hours so hop to it!\r\n\r\n";
      $message .= "$resetLink\r\n\r\n";
      $message .= "As always, if you have any questions, please contact us at support@apertura.photo.\r\n\r\nApertura Support";
      mail($email, "Apertura Password Reset", $message, "From: \"Apertura Support\" <support@" . DOMAIN . ">\r\n");
    }
    return true;
  }

  static function send_invitation($invitationEmail) {
    $userId = User::get_user_id_from_session();
    $username = $_SESSION['username'];

    // send the invitation
    $randomToken = User::create_random_token(32);
    /*$message =  "Your friend, $username, has invited you to use Apertura--a new photo storage and organization app that will knock your socks off.";
    $message .= "\r\n\r\nNavigate to the following secret URL to create your account and get started: http://" . SITE_ROOT . "/app/accept-invitation?token=$randomToken";
    $message .= "\r\n\r\nThis one-time email was sent to you because someone you know entered your email address indicating you are possibly interested in Apertura's products and/or services.";
    mail($invitationEmail, "Welcome to Apertura", $message, "From: support@" . DOMAIN . "\r\n");*/

    // save the invitation to the db
    $_invitationEmail = db_escape($invitationEmail);
    $sql = "INSERT INTO userInvitations
      (recipientEmail, dateSent, invitationToken, userId)
      VALUES('$_invitationEmail', NOW(), '$randomToken', $userId)";
    db_query($sql);

    return array(
      'email' => $invitationEmail,
      'secretURL' => "http://" . SITE_ROOT . "/app/accept-invitation?token=$randomToken"
    );
  }

  static function signin($username, $email, $password) {
    $debug = "u: $username, e: $email\n";
    $username = db_escape($username);
    $_email = db_escape($email);
    $password_hash = md5($password);

    $debug .= "u: $username, e: $email\n";

    $sql = "SELECT u.id, ut.token, u.email, u.username, u.status
      from users as u
      left join userUploadTokens as ut on u.id = ut.userId
      where (
        (username='$username' and username != '')
        or (email='$_email' and email != '')
        or (email='$username' and email != '')
      )
      and password='$password_hash'
      and (status='active' or status='suspended')";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      $accountName = ($row['username'] != '' ? $row['username'] : $row['email']);
      $debug .= "row found, id: {$row['id']}\n";
      $userId = $row['id'];
      $_SESSION['userid'] = $userId;
      $_SESSION['username'] = $accountName;
      $_SESSION['email'] = $row['email'];
      $_SESSION['status'] = $row['status'];

      setcookie('userid', $userId, time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('username', $accountName, time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('email', $row['email'], time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('status', $row['status'], time()+60*60*24*10000, '/', DOMAIN, false, false);

      $uploadToken = $row['token'];
      if (!$uploadToken) {
        User::create_upload_token($userId);
      }
      $debug .= "u: $accountName, e: $email\n";

      $role = 'user';
      if ($userId == 1) {
        $role = 'admin';
      }
      return [
        'userid' => $userId,
        'username' => $accountName,
        'email' => $row['email'],
        'uploadToken' => $uploadToken,
        'role' => $role,
        'status' => $row['status']
      ];
    }
    else {
      $debug .= "row not found: $sql\n";
    }
    throw new Exception("Invalid username/password", 401);
  }

  static function signin_with_token($username, $uploadToken, $shouldRedirect = true) {
    $username = db_escape($username);
    $uploadToken = db_escape($uploadToken);
    $sql = "SELECT u.id, ut.token, u.email, u.username
      from users as u
      inner join userUploadTokens as ut on u.id = ut.userId
      where (
        (username='$username' and username != '')
        or (email='$username' and email != '')
      )
      and ut.token='$uploadToken'
      and u.status='active'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      $userId = $row['id'];
      $_SESSION['userid'] = $userId;
      $_SESSION['username'] = $row['username'];
      $_SESSION['email'] = $row['email'];

      setcookie('userid', $userId, time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('username', $row['username'], time()+60*60*24*10000, '/', DOMAIN, false, false);
      setcookie('email', $row['email'], time()+60*60*24*10000, '/', DOMAIN, false, false);

      if ($shouldRedirect) {
        header("location: /app/home");
        exit();
      }
      else {
        return [
          'userid' => $userId,
          'username' => $row['username'],
          'email' => $row['email'],
          'uploadToken' => $uploadToken
        ];
      }
    }
    throw new Exception("Invalid username/token", 401);
  }

  static function signout() {
    $_SESSION['userid'] = '';
    $_SESSION['username'] = '';
    $_SESSION['email'] = '';
    $_SESSION['status'] = '';

    session_destroy();

    setcookie('userid', $userId, time()-3600, '/', DOMAIN, false, false);
    setcookie('username', $row['username'], time()-3600, '/', DOMAIN, false, false);
    setcookie('email', $row['email'], time()-3600, '/', DOMAIN, false, false);
    setcookie('status', 'active', time()-3600, '/', DOMAIN, false, false);
  }

  static function signup($email, $username, $password, $firstName, $lastName) {
    $newUserId = User::create_user($email, $username, $password, null);
    if ($newUserId) {
      $sql = "INSERT into userSubscriptions (userId, subscriptionType, period, price, subscriptionEnd)
        values($newUserId, 'trial', 1, 0, DATE_ADD(NOW(), INTERVAL 1 MONTH))";
      db_query($sql);
      return User::signin($username, $email, $password);
    }

    throw new Exception("Couldn't create a new user", 500);
  }

  static function renew_subscription($token) {
    $userId = User::get_user_id_from_session();
    $billingInfo = User::update_billing_info($token);

    $currentSubscriptionEnd = null;
    $sql = "SELECT id, subscriptionEnd
      from userSubscriptions
      where userId=$userId
      and status='active'
      ORDER by subscriptionEnd DESC LIMIT 1";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    if ($row) {
      $currentSubscriptionEnd = $row['subscriptionEnd'];
    }

    $bill = SubscriptionHelper::calculate_bill($userId);
    $token = db_escape($token);

    $newSubscriptionStart = $currentSubscriptionEnd && strtotime($currentSubscriptionEnd) > time() ? $currentSubscriptionEnd : date("Y-m-d");
    $sql = "INSERT INTO userSubscriptions (cardToken, subscriptionType, userId, period, price, totalAllowedFileSize, subscriptionStart, subscriptionEnd)
      VALUES('{$billingInfo['cardToken']}', 'monthly', $userId, {$bill['period']}, {$bill['price']}, {$bill['totalAllowedFileSize']}, '$newSubscriptionStart', DATE_ADD('$newSubscriptionStart', INTERVAL 1 MONTH))";
    db_query($sql);
    $subscriptionId = db_get_insert_id();

    $sql = "INSERT INTO subscriptionPayments (subscriptionId, price, dueDate, cardToken)
      VALUES($subscriptionId, {$bill['price']}, '$newSubscriptionStart', '{$billingInfo['cardToken']}')";
    db_query($sql);

    $_SESSION['status'] = 'active';
    setcookie('status', 'active', time()+60*60*24*10000, '/', DOMAIN, false, false);

    return User::get_subscription_info($userId);
  }

  static function update_billing_info($token) {
    if (!$token) {
      throw new Exception("No cc token provided");
    }

    $userId = User::get_user_id_from_session();
    $email = User::get_email_from_session();

    $customerId = null;
    $cardToken = null;
    \Stripe\Stripe::setApiKey(STRIPE_LIVE_PK);

    $sql = "SELECT customerId
      from users
      where id=$userId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    if ($row) {
      $customerId = $row['customerId'];
    }

    if (!$customerId) {
      $customer = \Stripe\Customer::create(array(
        "source" => $token,
        "email" => $email
      ));
      if (!$customer) {
        throw new Exception("Couldn't connect with Stripe to create a new user", 500);
      }
      $customerId = $customer->id;
      $cardToken = $customer->default_source;

      $sql = "UPDATE users SET customerId='$customerId', status='active' where id=$userId";
      db_query($sql);
    }
    else {
      $customer = \Stripe\Customer::retrieve($customerId);
      $customer->source = $token;
      $customer = $customer->save();
      $cardToken = $customer->default_source;

      $sql = "UPDATE users SET status='active' where id=$userId";
      db_query($sql);
    }

    // update any active subscriptions to use this new token
    $sql = "UPDATE userSubscriptions
      SET cardToken='$cardToken'
      where userId=$userId
      and status='active'
      and subscriptionEnd > NOW()";
    db_query($sql);

    return array(
      'customerId' => $customerId,
      'cardToken' => $cardToken
    );
  }

  static function update_email($email) {
    if (!User::email_is_available($email)) {
      throw new Exception("A user already exists with this email address.");
    }
    $userId = User::get_user_id_from_session();
    $email = db_escape($email);
    $sql = "UPDATE users SET email='$email'
      where id=$userId";
    db_query($sql);
    return true;
  }

  static function update_name($firstName, $lastName) {
    $userId = User::get_user_id_from_session();
    $firstName = db_escape($firstName);
    $lastName = db_escape($lastName);
    $sql = "UPDATE users SET firstName='$firstName', lastName='$lastName'
      where id=$userId";
    db_query($sql);
    return true;
  }

  static function update_password($oldPassword, $newPassword) {
    $userId = User::get_user_id_from_session();
    $sql = "select id from users
      where id=$userId
      and password=MD5('$oldPassword')";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if (!$row || $row['id'] != $userId) {
      throw new Exception("Unauthorized password update", 401);
    }
    $sql = "UPDATE users
      SET password=MD5('$newPassword')
      where id=$userId";
    db_query($sql);
    return true;
  }

  static function update_username($username) {
    if (!User::username_is_available($username)) {
      throw new Exception("A user already exists with this username.");
    }
    $userId = User::get_user_id_from_session();
    $username = db_escape($username);
    $sql = "UPDATE users SET username='$username'
      where id=$userId";
    db_query($sql);
    return true;
  }

  static function username_is_available($username) {
    $username = db_escape($username);
    $sql = "SELECT id FROM users where username='$username'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row)
      return false;
    return true;
  }

  /*
  public static function send_welcome_email($email) {
    $message = "Thanks for signing up for Apertura, we're glad to have you. We're sure you'll love the way we can automatically organize and preserve all your photos. The only thing you need to do now is install the app on your phones, tablets, laptops and desktop computers so all your photos can be put together.\r\n\r\nVisit http://apertura.photo/downloads on each of your devices to get the app. Please reply to this email if you have any questions.\r\n\r\nApertura Support\r\nsupport@apertura.photo";
    if (!mail($email, "Welcome to Apertura", $message, "From: \"Apertura Support\" <support@apertura.photo>\r\n")) {
      throw new Exception("failed to send to $email");
      //return error_get_last();
    }
    return "sent email to $email";
  }*/

  private static function create_user($email, $username, $password, $customerId) {
    if (!User::email_is_available($email)) {
      throw new Exception("A user already exists with this email address.", 406);
    }
    if ($username && !User::username_is_available($username)) {
      throw new Exception("A user already exists with this username.", 406);
    }

    $_email = db_escape($email);
    $username = db_escape($username);
    $_customerId = $customerId ? "'" . db_escape($customerId) . "'" : "NULL";

    $sql = "INSERT INTO users (email, username, password, customerId)
      values('$_email', '$username', md5('$password'), $_customerId)";
    db_query($sql);
    $userId = db_get_insert_id();

    $message = "Thanks for signing up for Apertura, we're glad to have you. We're sure you'll love the way we can automatically organize and preserve all your photos. The only thing you need to do now is install the app on your phones, tablets, laptops and desktop computers so all your photos can be put together.\r\n\r\nVisit http://apertura.photo/downloads on each of your devices to get the app. Please reply to this email if you have any questions.\r\n\r\nApertura Support\r\nsupport@apertura.photo";
    mail($email, "Welcome to Apertura", $message, "From: \"Apertura Support\" <support@apertura.photo>\r\n");

    return $userId;
  }

  private static function get_invitation_id($invitationToken) {
    $invitationToken = db_escape($invitationToken);
    $sql = "SELECT id from userInvitations
      where invitationToken='$invitationToken'
      and recipientUserId IS NULL";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      return $row['id'];
    }
  }

  private static function create_upload_token($userId) {
    if (!$userId || !is_numeric($userId)) {
      throw new Exception("Can't create upload token for bogus userId: $userId");
    }
    $token = User::create_random_token(32);

    $sql = "INSERT into userUploadTokens
      (token, userId, dateCreated)
      values('$token', $userId, NOW())";
    db_query($sql);

    return $token;
  }

  private static function create_random_token($length) {
    $token = '';
    $token_chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z','0','1','2','3','4','5','6','7','8','9'];
    for ($i=0; $i<$length; $i++) {
      $token .= $token_chars[rand(0, count($token_chars)-1)];
    }

    return $token;
  }
}
