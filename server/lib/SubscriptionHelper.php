<?php
require_once "lib/stripe-php-3.14.1/init.php";

class SubscriptionHelper {

  /*** Ends all trial subscriptions that have passed their subscriptionEnd date ***/
  static function get_next_bill_date($dayOfMonth) {
    $today = new DateTime();
    $todayDate = (int)$today->format("d");
    if ($dayOfMonth <= $todayDate) {
      $nextBillYear = (int)$today->format("Y");
      $nextBillMonth = (int)$today->format("n") + 1;
      if ($nextBillMonth > 12) {
        $nextBillYear++;
      }
      $nextBillDate = new DateTime("$nextBillYear-$nextBillMonth-01");
      $numDaysInNextMonth = (int)$nextBillDate->format("t");
      if ($numDaysInNextMonth >= $dayOfMonth) {
        $nextBillDate = new DateTime("$nextBillYear-$nextBillMonth-$dayOfMonth");
      }
      else {
        $nextBillDate = new DateTime("$nextBillYear-$nextBillMonth-$numDaysInNextMonth");
      }
    }
    else {
      $numDaysInMonth = (int)$today->format("t");
      if ($numDaysInMonth >= $dayOfMonth) {
        $nextBillDate = new DateTime($today->format("Y") . '-' . $today->format("m") . '-' . $dayOfMonth);
      }
      else {
        $nextBillDate = new DateTime($today->format("Y") . '-' . $today->format("m") . '-' . $numDaysInMonth);
      }
    }
    return $nextBillDate;
  }

  /*** Ends all trial subscriptions that have passed their subscriptionEnd date ***/
  static function end_trial_subscriptions() {
    $subscriptions = [];
    $sql = "SELECT u.id as userId, us.id as subscriptionId, u.email, u.firstName, u.lastName, u.username FROM users as u
      inner join userSubscriptions as us on u.id=us.userId
      where us.subscriptionEnd < NOW()
      and us.subscriptionType = 'trial'
      and us.status='active'";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $subscriptions[] = $row;
    }

    $ended_subscriptions = [];
    $error_subscriptions = [];
    foreach ($subscriptions as $sub) {
      try {
        // expire subscription
        $sql = "UPDATE userSubscriptions set status='expired'
          where id={$sub['subscriptionId']} and userId={$sub['userId']}";
        db_query($sql);

        // suspend user
        $sql = "UPDATE users set status='suspended'
          where id={$sub['userId']}";
        db_query($sql);

        // send email with link to re-subscribe
        $name = '';
        if ($sub['firstName']) {
          $name = $sub['firstName'] . ' ' . $sub['lastName'];
        }
        else if ($sub['username']) {
          $name = $sub['username'];
        }

        SubscriptionHelper::send_expired_email($sub['userId'], $sub['email'], $name);
        $ended_subscriptions[] = $sub;
      }
      catch (Exception $ex) {
        $error_subscriptions[] = $sub;
      }
    }

    return array(
      'subscriptions' => count($subscriptions),
      'ended' => count($ended_subscriptions),
      'errors' => $error_subscriptions
    );
  }

  static function send_expired_email($userId, $email, $name) {
    $msg = "";
    if ($name) {
      $msg = "$name,\r\n\r\n";
    }
    $msg .= "This little email is just a notice that your trial subscription of Apertura has ended. We hate to see you go, especially when Apertura has so much to offer. For just 99 cents per month you can continue to use Apertura to backup and organize all your photos on all your devices.\r\n\r\n";
    $msg .= "No pressure, but when you're ready, just come back to https://apertura.photo/app/renew and renew your subscription. We look forward to seeing you again!\r\n\r\n";
    $msg .= "Apertura Support\r\n\r\n";
    $msg .= "Note: Any photos that you uploaded during your trial period are still in your account. However, they will be removed after 90 days if you don't renew.\r\n\r\n";

    mail($email, "Apertura subscription expired", $msg, "From: 'Apertura Support' <support@apertura.photo>\r\n");
  }

  static function bill_current_subscriptions() {
    \Stripe\Stripe::setApiKey(STRIPE_LIVE_PK);

    // get current subscriptions and Stripe customer ids
    $subscriptions = [];
    $sql = "SELECT u.id as userId, u.email, u.firstName, u.lastName, u.username, u.customerId, us.id as subscriptionId, us.cardToken as subscriptionCardToken, p.cardToken, p.price, p.id as paymentId
      FROM users as u
      inner join userSubscriptions as us on u.id=us.userId
      inner join subscriptionPayments as p on us.id=p.subscriptionId
      where us.status='active'
      and us.subscriptionType='monthly'
      and us.subscriptionStart <= NOW() and us.subscriptionEnd > NOW()
      and p.dueDate <= NOW()
      and p.status='pending'";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $subscriptions[] = $row;
    }

    print_r($subscriptions);
    echo "\n";

    $billed_subscriptions = [];
    $unbilled_subscriptions = [];
    $error_subscriptions = [];
    foreach ($subscriptions as $sub) {
      try {
        $userId = $sub['userId'];
        $subscriptionBill = SubscriptionHelper::calculate_bill($userId);
        $price = $subscriptionBill['price'];

        print_r($subscriptionBill);
        echo "\n";

        // update the userSubscriptions record with the new amount (if changed)
        if ($price != $sub['price']) {
          SubscriptionHelper::update_subscription_rate_for_user($userId, $price);
        }

        echo "charge\n";

        // use Stripe to bill them
        $charge = \Stripe\Charge::create(array(
          "amount" => $price * 100, // price in cents
          "currency" => "usd",
          "customer" => $sub['customerId']
        ));

        print_r($charge);
        echo "\n";

        if ($charge && $charge['status'] == 'succeeded') {
          echo "succeeded\n";
          // update the users' payment history
          SubscriptionHelper::mark_subscription_payment_as_paid($sub['subscriptionId'], $sub['paymentId']);
          SubscriptionHelper::insert_next_subscription_payment($sub['subscriptionId'], $price, $sub['subscriptionCardToken']);
          $billed_subscriptions[] = $sub;
        }
        else {
          echo "failed\n";

          // suspend user account (not subscription) if there was an error
          echo "suspend user\n";
          SubscriptionHelper::suspend_user_account($userId);
          echo "end subscription\n";
          SubscriptionHelper::end_user_subscription($sub['subscriptionId']);

          echo "send expired email\n";
          // send an email if there was an error
          $name = '';
          if ($sub['firstName']) {
            $name = $sub['firstName'] . ' ' . $sub['lastName'];
          }
          else if ($sub['username']) {
            $name = $sub['username'];
          }
          SubscriptionHelper::send_user_suspension_email($userId, $name, $sub['email']);
          $unbilled_subscriptions[] = $sub;
        }
      }
      catch (Exception $ex) {
        echo $ex->getMessage() . "\n";
        $error_subscriptions[] = $sub;
      }
    }

    return array(
      'subscriptions' => count($subscriptions),
      'billed' => count($billed_subscriptions),
      'unbilled' => count($unbilled_subscriptions),
      'errors'=> $error_subscriptions
    );
  }

  static function mark_subscription_payment_as_paid($subscriptionId, $paymentId) {
    $subscriptionId = db_escape($subscriptionId);
    $paymentId = db_escape($paymentId);

    $sql = "UPDATE subscriptionPayments
      SET paidDate=NOW(), status='paid'
      WHERE id=$paymentId
      AND subscriptionId=$subscriptionId";
    db_query($sql);
  }

  static function insert_next_subscription_payment($subscriptionId, $price, $cardToken) {
    $subscriptionId = db_escape($subscriptionId);
    $price = db_escape($price);
    $cardToken = db_escape($cardToken);
    $sql = "INSERT INTO subscriptionPayments
      (subscriptionId, price, cardToken, dueDate)
      VALUES($subscriptionId, $price, '$cardToken', DATE_ADD(NOW(), INTERVAL 1 MONTH))";
    db_query($sql);
  }

  static function suspend_user_account($userId) {
    $userId = db_escape($userId);
    $sql = "UPDATE users
      SET status='suspended'
      WHERE id=$userId";
    db_query($sql);
  }

  static function send_user_suspension_email($userId, $name, $email) {
    $message = "";
    if ($name) {
      $message = "$name,\r\n\r\n";
    }
    $message .= "We sure are happy that you've chosen to use Apertura. Unfortunately, we had some trouble charging your card for payment. Your account has been suspended, but you can sign in anytime and fix it with updated credit card information.\r\n\r\n";
    $message .= "Just visit https://apertura.photo/app and sign in.\r\n\r\n";
    $message .= "Thanks for your time. We look forward to seeing you soon!\r\n\r\n";
    $message .= "Apertura Support";
    mail($email, "Apertura account suspended", $message, "From: 'Apertura Support' <support@apertura.photo>\r\n");
  }

  static function end_user_subscription($subscriptionId) {
    $subscriptionId = db_escape($subscriptionId);
    $sql = "UPDATE userSubscriptions
      SET status='expired'
      WHERE id=$subscriptionId";
    db_query($sql);

    $sql = "UPDATE subscriptionPayments
      SET status='expired'
      WHERE subscriptionId=$subscriptionId
      AND status='pending'";
    db_query($sql);
  }

  static function warn_ending_trial_subscriptions($daysLeft) {
    if (!is_numeric($daysLeft)) {
      throw new Exception("Invalid argument");
    }
    $daysLeftPlusOne = $daysLeft + 1;

    // get current trial subscriptions with end dates less than $daysLeft days from now
    $ending_subscriptions = [];
    $sql = "SELECT u.id as userId, us.id as subscriptionId, u.email, u.firstName, u.lastName, u.username, us.subscriptionEnd
      FROM users as u
      inner join userSubscriptions as us on u.id=us.userId
      where us.subscriptionEnd > DATE_ADD(NOW(), INTERVAL $daysLeft DAY) and us.subscriptionEnd < DATE_ADD(NOW(), INTERVAL $daysLeftPlusOne DAY)
      and us.subscriptionType = 'trial'
      and us.status='active'";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $ending_subscriptions[] = $row;
    }

    $formattedExpDate = date("mmm d, Y", strtotime($sub['subscriptionEnd']));
    $messageBody = "Your trial of Apertura is going to expire soon on $formattedExpDate. To continue using Apertura, you'll need to add a credit card to your account. It's just \$$price per month to keep all your photos backed up and accessible from anywhere. What could be better than that?\r\n\r\n";
    $messageBody .= "https://apertura.photo/app/renew\r\n\r\n";
    $messageBody .= "As always, please let us know if you have any comments or questions. We'd love to hear from you!\r\n\r\n";
    $messageBody .= "Apertura Support";

    // send an email with a link to renew
    $error_subscriptions = [];
    $warned_subscriptions = [];
    foreach ($ending_subscriptions as $sub) {
      try {
        $name = '';
        if ($sub['firstName']) {
          $name = $sub['firstName'] . ' ' . $sub['lastName'];
        }
        else if ($sub['username']) {
          $name = $sub['username'];
        }
        $message = '';
        if ($name) {
          $message .= "$name,\r\n\r\n";
        }
        $message .= $messageBody;
        mail($sub['email'], "Apertura trial ending", $message, "From: 'Apertura Support' <support@apertura.photo>\r\n");
        $warned_subscriptions[] = $sub;
      }
      catch (Exception $ex) {
        $error_subscriptions[] = $sub;
      }
    }

    return array(
      'ending' => count($ending_subscriptions),
      'warned' => count($warned_subscriptions),
      'errors' => $error_subscriptions
    );
  }

  static function calculate_bill($userId) {
    $totalStorageUsed = SubscriptionHelper::get_total_storage_used_for_user($userId);

    // determine the new subscription price
    $pricePer50GB = 1;
    $qtyOf50GBIncrements = ceil($totalStorageUsed / 50);
    if ($qtyOf50GBIncrements == 0) {
      $qtyOf50GBIncrements = 1;
    }
    $monthlyRate = $qtyOf50GBIncrements * $pricePer50GB - 0.01;
    $allowedStorage = $qtyOf50GBIncrements * 50;

    // return the new payment object (period, payment, storage allowed)
    return array(
      'price' => $monthlyRate,
      'totalAllowedFileSize' => $allowedStorage,
      'period' => 1,
      'subscriptionType' => 'monthly'
    );
  }

  static function update_subscription_rate_for_user($userId, $monthlyRate) {
    $userId = db_escape($userId);
    $monthlyRate = db_escape($monthlyRate);
    $sql = "UPDATE userSubscriptions
      SET price=$monthlyRate
      WHERE userId=$userId
      AND subscriptionEnd > NOW()
      AND status='active'";
    db_query($sql);
  }

  static function get_total_storage_used_for_user($userId) {
    $userId = db_escape($userId);

    $totalStorageUsed = 0;

    $sql = "SELECT SUM(totalFileSize) as totalStorageUsed
      from photoFiles as pf
      inner join photos as p on pf.photoId=p.id
      where p.userId=$userId
      and pf.status='active'
      and p.status='active'";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    if ($row && $row['totalStorageUsed']) {
      $totalStorageUsed = $row['totalStorageUsed'];
    }

    return $totalStorageUsed;
  }
}