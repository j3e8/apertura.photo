<?php
class Collection {
  public static function delete_collection($id) {
    $userId = User::get_user_id_from_session();

    $sql = "DELETE FROM collectionPhotoFiles
      WHERE collectionId=$id
      AND collectionId IN (
        SELECT id FROM collections WHERE userId=$userId
      )";
    db_query($sql);

    $sql = "DELETE FROM collections WHERE id=$id AND userId=$userId";
    db_query($sql);

    return true;
  }

  public static function get_collections_for_user($userId) {
    if (!$userId) {
      $userId = User::get_user_id_from_session();
    }
    $userId = db_escape($userId);

    $collections = [];
    $sql = "select c.id, name, dateCreated, shareToken, count(cpf.photoFileId) as totalPhotoFiles
      from collections as c
      left join collectionPhotoFiles as cpf on c.id=cpf.collectionId
      where userId=$userId
      group by c.id
      order by c.name";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $collections[] = $row;
    }

    return $collections;
  }

  public static function get_collections_for_user_with_sample_photos($userId) {
    if (!$userId) {
      $userId = User::get_user_id_from_session();
    }
    $userId = db_escape($userId);

    $limit = 15;

    $collections = [];
    $sql = "SELECT id, name, dateCreated, shareToken, filename, totalPhotoFiles
      FROM ( SELECT  @prev := '', @n := 0 ) init
      JOIN
      ( SELECT  @n := if(c.id != @prev, 1, @n + 1) AS n,
        @prev := c.id,
        c.id, c.name, c.dateCreated, c.shareToken, pf.filename, ct.totalPhotoFiles
        FROM  collections as c
        left join collectionPhotoFiles as cpf on c.id=cpf.collectionId
        left join photoFiles as pf on cpf.photoFileId=pf.id
        left join photos as p on pf.photoId=p.id
        left join (
            select c.id, count(cpf.photoFileId) as totalPhotoFiles
            from collections as c
            left join collectionPhotoFiles as cpf on c.id=cpf.collectionId
            where c.userId=$userId
            and c.status='active'
            group by c.id
        ) ct on c.id=ct.id
        where c.userId=$userId
        and c.status='active'
        ORDER BY
        c.name ASC,
        c.dateCreated DESC
      ) x
      WHERE  n <= $limit
      ORDER BY  id, n;";
    $result = db_query($sql);
    $lastCollectionId = null;
    while ($row = db_fetch_assoc($result)) {
      if ($row['id'] == $lastCollectionId) {
        $collections[count($collections)-1]['photos'][] = $row['filename'];
      }
      else {
        $row['photos'] = [];
        if ($row['filename']) {
          $row['photos'][] = $row['filename'];
        }
        unset($row['filename']);
        $collections[] = $row;
      }
      $lastCollectionId = $row['id'];
    }

    return $collections;
  }

  public static function get_collection_info($id) {
    $userId = User::get_user_id_from_session();
    $id = db_escape($id);
    $sql = "select c.id, name, dateCreated, shareToken, count(cpf.photoFileId) as totalPhotoFiles
      from collections as c
      left join collectionPhotoFiles as cpf on c.id=cpf.collectionId
      where userId=$userId
      and c.id=$id
      and c.status='active'
      group by c.id";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    return $row;
  }

  public static function get_shared_collection_info($token) {
    $token = db_escape($token);
    $sql = "select c.id, name, dateCreated, shareToken, count(cpf.photoFileId) as totalPhotoFiles, u.username
      from collections as c
      inner join users as u on c.userId=u.id
      left join collectionPhotoFiles as cpf on c.id=cpf.collectionId
      where c.shareToken='$token'
      and c.status='active'
      group by c.id";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    return $row;
  }

  public static function get_photos_for_collection($collectionId) {
    $userId = User::get_user_id_from_session();
    $collectionId = db_escape($collectionId);
    $photos = [];
    $sql = "select pf.id, pf.photoId, pf.filename, pf.originalFilename, p.dateTaken, t.id as tagId, t.tagName
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      inner join collectionPhotoFiles as cpf on pf.id=cpf.photoFileId
      inner join collections as c on cpf.collectionId=c.id
      left join photoTags as pt on pf.id=pt.photoFileId
      left join tags as t on pt.tagId=t.id
      where cpf.collectionId=$collectionId
      and c.status='active'
      and pf.status='active'
      and p.status='active'
      and p.userId=$userId
      order by pf.id
      ";
    $results = db_query($sql);
    $photosAndTags = [];
    while ($row = db_fetch_assoc($results)) {
      $photosAndTags[] = $row;
    }
    $photos = Tag::collapse_tags_in_photo_results($photosAndTags);
    return $photos;
  }

  public static function get_photos_for_shared_collection($collectionId, $token) {
    $collectionId = db_escape($collectionId);
    $token = db_escape($token);
    $photos = [];

    if (User::is_user_signed_in()) {
      $userId = User::get_user_id_from_session();
      $sql = "select pf.id, pf.photoId, pf.filename, pf.originalFilename, p.dateTaken, my.tagId, my.tagName, my.myPhotoFileId
        from photos as p
        inner join photoFiles as pf on p.id=pf.photoId
        inner join collectionPhotoFiles as cpf on pf.id=cpf.photoFileId
        inner join collections as c on cpf.collectionId=c.id
        left join (
          select pf.id as myPhotoFileId, pf.md5hash, pf.sha1hash, t.id as tagId, t.tagName
          from photoFiles as pf
          inner join photos as p on pf.photoId=p.id
          left join photoTags as pt on pf.id=pt.photoFileId
          left join tags as t on pt.tagId=t.id
          where p.userId=$userId
          and p.status='active'
          and pf.status='active'
        ) as my on pf.md5hash=my.md5hash and pf.sha1hash=my.sha1hash
        where cpf.collectionId=$collectionId
        and c.status='active'
        and c.shareToken='$token'
        and pf.status='active'
        and p.status='active'
        order by pf.id";
    }
    else {
      $sql = "select pf.id, pf.photoId, pf.filename, pf.originalFilename, p.dateTaken
        from photos as p
        inner join photoFiles as pf on p.id=pf.photoId
        inner join collectionPhotoFiles as cpf on pf.id=cpf.photoFileId
        inner join collections as c on cpf.collectionId=c.id
        where cpf.collectionId=$collectionId
        and c.status='active'
        and c.shareToken='$token'
        and pf.status='active'
        and p.status='active'
        order by pf.id";
    }
    $results = db_query($sql);
    $photosAndTags = [];
    while ($row = db_fetch_assoc($results)) {
      $photosAndTags[] = $row;
    }
    $photos = Tag::collapse_tags_in_photo_results($photosAndTags);
    return $photos;
  }

  public static function import_photos_from_shared_collection($photoFileIds) {
    $userId = User::get_user_id_from_session();
    foreach($photoFileIds as $photoFileId) {
      PhotoManager::copy_photo_file_to_user($photoFileId, $userId);
    }
  }

  public static function create_collection($name) {
    $userId = User::get_user_id_from_session();
    $_name = db_escape($name);
    $token = General::create_guid(32);
    $sql = "insert into collections (userId, name, shareToken)
      values($userId, '$_name', '$token')";
    db_query($sql);
    $collectionId = db_get_insert_id();
    return $collectionId;
  }

  public static function create_collection_with_photos($collectionName, $photoFileIds) {
    $collectionId = Collection::create_collection($collectionName);
    return Collection::add_photos_to_collection($collectionId, $photoFileIds);
  }
  
  public static function add_photos_to_collection($collectionId, $photoFileIds) {
    $collectionId = db_escape($collectionId);

    foreach($photoFileIds as $photoFileId) {
      try {
        $photoFileId = db_escape($photoFileId);
        $sql = "insert into collectionPhotoFiles
          (collectionId, photoFileId)
          values($collectionId, $photoFileId)";
        db_query($sql);
      }
      catch (Exception $ex) { }
    }

    return array(
      'collectionId' => $collectionId,
      'photosAdded' => count($photoFileIds)
    );
  }

  static function share_collection($collectionId, $emails) {
    $userId = User::get_user_id_from_session();
    $collectionId = db_escape($collectionId);
    if (!isset($emails) || !count($emails)) {
      throw new Exception("Invalid list of emails");
    }

    $user_info = User::get_user_info($userId);
    $username = '';
    if ($user_info['firstName']) {
      $username = $user_info['firstName'] . ' ' . $user_info['lastName'];
    }
    else if ($user_info['username']) {
      $username = $user_info['username'];
    }
    else {
      $username = $user_info['email'];
    }

    $collection = Collection::get_collection_info($collectionId);
    $shareLink = "https://" . DOMAIN . "/app/browse-shared-collection?t=" . $collection['shareToken'];

    $message = "Hi there!\r\n\r\n";
    $message .= "Someone you know ($username) has shared photos with you using Apertura! This is fantastic news! You can click this link to view the photo collection\r\n\r\n";
    $message .= "$shareLink\r\n\r\n";
    $message .= "By visiting the link above you'll be able to see the photos that are shared with you as well as download them or even add them to your own Apertura account. If you don't know about Apertura yet, you might want to learn more at http://apertura.photo.\r\n\r\n";
    $message .= "Apertura Support";

    foreach ($emails as $email) {
      $email = db_escape($email);
      $sql = "INSERT INTO collectionShares
        (collectionId, email)
        VALUES($collectionId, '$email')
        ";
      db_query($sql);

      mail($email, "Someone shared photos with you", $message, "From: 'Apertura Support' <support@apertura.photo>\r\n");
    }
  }

  static function update_collection($id, $collectionName) {
    $userId = User::get_user_id_from_session();
    $id = db_escape($id);
    $collectionName = db_escape($collectionName);
    $sql = "SELECT id FROM collections
      WHERE userId=$userId
      AND name='$collectionName'
      AND id != $id";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      throw new Exception("That collection name is already in use", 406);
    }

    $sql = "UPDATE collections SET name='$collectionName' WHERE userId=$userId AND id=$id";
    db_query($sql);

    return true;
  }
}