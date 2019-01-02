<?php
class Admin {
  public static function list_users() {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $users = [];
    $sql = "select u.id, email, username, firstName, lastName, dateJoined, us.subscriptionStart, subscriptionType
      from users as u
      left join userSubscriptions as us on u.id=us.userId
      order by u.dateJoined desc";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $users[] = $row;
    }
    return $users;
  }
  
  public static function search_users($query) {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $query = db_escape($query);
    $users = [];
    $sql = "select u.id, email, username, firstName, lastName, dateJoined, us.subscriptionStart, subscriptionType
      from users as u
      left join userSubscriptions as us on u.id=us.userId
      where username like '%$query%' 
      or email like '%$query%'
      or CONCAT(firstName, lastName) like '%query%'";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $users[] = $row;
    }
    return $users;
  }
  
  public static function get_usage_for_user($userId) {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $userId = db_escape($userId);
    $usage = array();
    $sql = "SELECT count(*) totalPhotos, sum(totalFileSize)/1000000000 as totalStorageUsed
      FROM photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'";
    $result = db_query($sql);
    if ($row = db_fetch_assoc($result)) {
      $usage = $row;
    }
    return $usage;
  }

  public static function get_users_last_uploads($userId, $limit) {
    if (!User::is_user_admin(User::get_user_id_from_session())) {
      throw new Exception("Unauthorized");
    }
    $userId = db_escape($userId);
    if (!$limit) {
      $limit = 100;
    }
    $photos = [];
    $sql = "select cameraModel, photoId, pf.id as photoFileId, filename, originalFilename, pf.status, dateUploaded
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'
      order by pf.dateUploaded desc
      limit $limit";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $photos[] = $row;
    }
    return $photos;
  }
  
  public static function subscription_distribution() {
    $subscriptionTypes = [];
    $sql = "select subscriptionType, count(u.id) as totalUsers
from users as u
left join userSubscriptions as us ON u.id=us.userId
group by subscriptionType
order by subscriptionType";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $subscriptionTypes[] = $row;
    }
    return $subscriptionTypes;
  }
  
  public static function photo_distribution() {
    $tiers = [];
    $sql = "select minPhotos, maxPhotos, count(id) as totalUsers
	from (
		select u.id,
	    case
	    	when count(p.id) = 0 then 0
	    	else POW(10, FLOOR(LOG10(count(p.id))))
	    end as minPhotos,
	    case
	    	when count(p.id) = 0 then 0
	    	else POW(10, FLOOR(LOG10(count(p.id))) + 1)
	    end as maxPhotos
		from users as u
		left join photos as p on u.id=p.userId
		where u.status='active'
		group by u.id
	) as tbl
	group by minPhotos, maxPhotos
	order by minPhotos, maxPhotos, totalUsers";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $tiers[] = $row;
    }
    return $tiers;
  }
}