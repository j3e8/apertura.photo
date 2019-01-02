<?php
class Photo {
  static function count_photos() {
    $userId = User::get_user_id_from_session();
    $counts = [];

    $sql = "SELECT
      count(DISTINCT pf.photoId) AS photos,
      count(pf.id) AS photoFiles,
      count(p.id) - count(p.dateTaken) as photosWithoutDate
      from photos as p
      inner join photoFiles AS pf ON p.id=pf.photoId
      where p.userId=$userId and p.status='active' and pf.status='active'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    $counts = array_merge($counts, $row);

    $sql = "SELECT count(*) AS untaggedPhotos
      FROM photos as p
      inner join photoFiles AS pf on p.id=pf.photoId
      left join photoTags as pt on pf.id=pt.photoFileId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'
      and pt.tagId is null";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    $counts = array_merge($counts, $row);

    return $counts;
  }

  static function delete_photo($photoFileId) {
    $userId = User::get_user_id_from_session();
    $sql = "select p.id from photos as p inner join photoFiles as pf on p.id=pf.photoId where pf.id=$photoFileId and p.userId=$userId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    $photoId = $row['id'];

    $sql = "update photoFiles set status='deleted' where id=$photoFileId and photoId=$photoId";
    $result = db_query($sql);

    $sql = "select id from photoFiles where photoId=$photoId and status='active'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if (!$row || !$row['id']) {
      $sql = "update photos set status='deleted' where id=$photoId and userId=$userId";
      db_query($sql);
    }
    return true;
  }

  static function get_photo_info($photoFileId) {
    if (!is_numeric($photoFileId)) {
      throw new Exception("Bad photo file id");
    }
    $sql = "SELECT filename FROM photoFiles
      WHERE id=$photoFileId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    return $row;
  }

  static function get_photos_for_all_time_by_year() {
    $userId = User::get_user_id_from_session();

    $folders = [];
    $sql = "select
      YEAR(p.dateTaken) as yearTaken, pf.photoId, pf.filename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, count(pf.id) as numPhotos
      from photos as p
      inner join (
        select pf.* from photoFiles as pf
        inner join photos as p on pf.photoId=p.id
        where p.userId=$userId
        and p.status='active'
        and pf.status='active'
        order by rand()
      ) as pf on p.id = pf.photoId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'
      and p.dateTaken IS NOT NULL
      and YEAR(p.dateTaken) != 0
      group by YEAR(p.dateTaken)";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $folders[] = $row;
    }
    return $folders;
  }

  static function get_photos_for_day($date) {
    $userId = User::get_user_id_from_session();
    $datetime = new DateTime($date);
    $dateStart = $datetime->format("Y-m-d 00:00:00");
    $photos = [];
    $sql = "select pf.id, pf.photoId, pf.filename, pf.originalFilename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, p.dateTaken, t.id as tagId, t.tagName
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      left join photoTags as pt on pf.id=pt.photoFileId
      left join tags as t on pt.tagId=t.id
      where p.dateTaken between '$dateStart' and DATE_ADD('$dateStart', INTERVAL 1 DAY)
      and pf.status='active'
      and p.status='active'
      and p.userId=$userId
      order by pf.id
      ";
    $results = db_query($sql);
    $lastPhotoId = null;
    while ($row = db_fetch_assoc($results)) {
      if ($row['id'] == $lastPhotoId) {
        $photos[count($photos)-1]['tags'][] = array('id' => $row['tagId'], 'tagName' => $row['tagName']);
      }
      else {
        $row['tags'] = [];
        if ($row['tagName']) {
          $row['tags'][] = array('id' => $row['tagId'], 'tagName' => $row['tagName']);
        }
        unset($row['tagId']);
        unset($row['tagName']);
        $photos[] = $row;
      }
      $lastPhotoId = $row['id'];
    }
    return $photos;
  }

  static function get_photos_for_month($monthAsDate) {
    $userId = User::get_user_id_from_session();
    $date = new DateTime($monthAsDate);
    $monthStart = $date->format("Y-m-01 00:00:00");

    $folders = [];
    $sql = "select
      DATE(p.dateTaken) as dateTaken, pf.photoId, pf.filename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, count(pf.id) as numPhotos
      from photos as p
      inner join (
        select pf.* from photoFiles as pf
        inner join photos as p on pf.photoId=p.id
        where p.userId=$userId
        and p.dateTaken between '$monthStart' and DATE_ADD('$monthStart', INTERVAL 1 MONTH)
        and p.status='active'
        and pf.status='active'
        order by rand()
      ) as pf on p.id = pf.photoId
      where p.userId=$userId
      and p.dateTaken between '$monthStart' and DATE_ADD('$monthStart', INTERVAL 1 MONTH)
      and p.status='active'
      and pf.status='active'
      group by DATE(dateTaken)";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $folders[] = $row;
    }
    return $folders;
  }

  static function get_photos_for_tag($tagId) {
    $userId = User::get_user_id_from_session();
    $tagId = db_escape($tagId);

    $photos = [];
    $sql = "select pf.id, pf.photoId, pf.filename, pf.originalFilename, p.dateTaken, UNIX_TIMESTAMP(pf.lastModified) as lastModified, t.id as tagId, t.tagName
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      inner join photoTags as pt on pf.id=pt.photoFileId
      inner join photoTags as pt2 on pf.id=pt2.photoFileId
      inner join tags as t on pt2.tagId=t.id
      where pt.tagId=$tagId
      and pf.status='active'
      and p.status='active'
      and p.userId=$userId
      order by p.dateTaken DESC, pf.id DESC
      ";
    $results = db_query($sql);
    $lastPhotoId = null;
    while ($row = db_fetch_assoc($results)) {
      if ($row['id'] == $lastPhotoId) {
        $photos[count($photos)-1]['tags'][] = array('id' => $row['tagId'], 'tagName' => $row['tagName']);
      }
      else {
        $row['tags'] = [];
        if ($row['tagName']) {
          $row['tags'][] = array('id' => $row['tagId'], 'tagName' => $row['tagName']);
        }
        unset($row['tagId']);
        unset($row['tagName']);
        $photos[] = $row;
      }
      $lastPhotoId = $row['id'];
    }
    return $photos;
  }

  static function get_photos_for_year($year) {
    $userId = User::get_user_id_from_session();
    $dateStart = "$year-01-01";

    $folders = [];
    $sql = "select
      MONTH(p.dateTaken) as dateTaken, pf.photoId, pf.filename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, count(pf.id) as numPhotos
      from photos as p
      inner join (
        select pf.* from photoFiles as pf
        inner join photos as p on pf.photoId=p.id
        where p.userId=$userId
        and p.dateTaken between '$dateStart' and DATE_ADD('$dateStart', INTERVAL 1 YEAR)
        and p.status='active'
        and pf.status='active'
        order by rand()
      ) as pf on p.id = pf.photoId
      where p.userId=$userId
      and p.dateTaken between '$dateStart' and DATE_ADD('$dateStart', INTERVAL 1 YEAR)
      and p.status='active'
      and pf.status='active'
      group by MONTH(dateTaken)";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $folders[] = $row;
    }
    return $folders;
  }

  static function get_photos_without_date() {
    $userId = User::get_user_id_from_session();
    $photos = [];
    $sql = "select pf.*, t.tagName
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      left join photoTags as pt on pf.id=pt.photoFileId
      left join tags as t on pt.tagId=t.id
      where p.dateTaken IS NULL
      and pf.status='active'
      and p.status='active'
      and p.userId=$userId
      order by pf.id
      ";
    $results = db_query($sql);
    $lastPhotoId = null;
    while ($row = db_fetch_assoc($results)) {
      if ($row['id'] == $lastPhotoId) {
        $photos[count($photos)-1]['tags'][] = $row['tagName'];
      }
      else {
        $row['tags'] = [];
        if ($row['tagName']) {
          $row['tags'][] = $row['tagName'];
        }
        unset($row['tagName']);
        $photos[] = $row;
      }
      $lastPhotoId = $row['id'];
    }
    return $photos;
  }

  static function get_random_photo($minWidth, $minHeight) {
    $userId = User::get_user_id_from_session();
    $orientation = "";
    if ($minHeight && $minWidth) {
      if ($minHeight > $minWidth) {
        $orientation = "portrait";
      }
      else {
        $orientation = "landscape";
      }
    }
    $sql = "SELECT * FROM photos as p
      inner join photoFiles as pf on p.id=pf.photoid
      WHERE p.userId=$userId
      and pf.format='jpg'
      and p.status='active'
      and pf.status='active' ";
    if ($minWidth) {
      $sql .= " and pf.width > $minWidth ";
    }
    if ($minHeight) {
      $sql .= " and pf.height > $minHeight ";
    }
    switch ($orientation) {
      case "landscape":
        $sql .= " and pf.width > pf.height ";
        break;
      case "portrait":
        $sql .= " and pf.height > pf.width ";
        break;
      default:
        break;
    }
    $sql .= " order by rand() limit 1";

    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    return $row;
  }

  static function get_random_untagged_photo() {
    $userId = User::get_user_id_from_session();
    $sql = "select p.dateTaken, pf.photoId, pf.id, pf.filename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, pf.originalFilename
      from
      (
          select id, dateTaken
          from photos as p
          where p.userId=$userId
          and p.id not in (select distinct(photoId) from photoFiles inner join photoTags on photoFiles.id=photoTags.photoFileId)
          and p.status='active'
          order by rand()
          limit 1
      ) as p
      inner join photoFiles as pf on p.id=pf.photoId
      and pf.status='active'";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $photos[] = $row;
    }
    return $photos;
  }

  static function get_recent_photos($timeframe) {
    $userId = User::get_user_id_from_session();
    $timeframeClause = '';
    switch ($timeframe) {
      case 'hour':
      case 'day':
      case 'week':
      case 'month':
        $timeframeClause = "and pf.dateUploaded >= DATE_SUB(NOW(), INTERVAL 1 $timeframe)";
        break;
      default:
        break;
    }
    $photos = [];
    $sql = "select p.dateTaken, pf.*, t.id as tagId, t.tagName
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      left join photoTags as pt on pf.id=pt.photoFileId
      left join tags as t on pt.tagId=t.id
      where pf.status='active'
      and p.status='active'
      and p.userId=$userId
      $timeframeClause
      order by pf.dateUploaded desc, pf.id desc
      limit 500";
    $results = db_query($sql);
    $photosAndTags = [];
    while ($row = db_fetch_assoc($results)) {
      $photosAndTags[] = $row;
    }
    $photos = Tag::collapse_tags_in_photo_results($photosAndTags);
    return $photos;
  }

  static function hash_exists($md5hash, $sha1hash, $uploadToken) {
    $userId = $_SESSION['userid'];
    if (!$userId || !is_numeric($userId)) {
      $userId = User::get_user_from_upload_token($uploadToken);
    }
    if (!$userId) {
      throw new Exception("Unauthorized photo upload", 401);
    }
    if (User::is_user_suspended($userId)) {
      throw new Exception("Expired subscription", 401);
    }

    $md5hash = db_escape($md5hash);
    $sha1hash = db_escape($sha1hash);

    $sql = "SELECT * FROM photos as p
      inner join  photoFiles as pf ON p.id=pf.photoId
      where p.userId=$userId
      and pf.md5hash='$md5hash'
      and pf.sha1hash='$sha1hash'";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row['id']) {
      return true;
    }
    return false;
  }

  static function output_photo($userId, $randomFolder, $photoFileId, $size, $noredirect = false) {
    $subfolder = '';
    if ($size && $size <= 600) {
      $subfolder = '600px/';
    }
    else if ($size && $size <= 1920) {
      $subfolder = '1920px/';
    }

    $photoFileId = db_escape($photoFileId);
    $sql = "select filename, UNIX_TIMESTAMP(lastModified) as lastModified from photoFiles where id=$photoFileId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    $lastModified = $row['lastModified'];

    $extension = 'jpg';
    if (!$size) {
      $extension = substr($row['filename'], strrpos($row['filename'], '.') + 1);
    }

    if (!$noredirect) {
      header("location: https://s3.amazonaws.com/media.apertura.photo/$userId/$randomFolder/$subfolder$photoFileId.$extension?$lastModified");
      // TODO: when we have SSL for this CNAME we can switch
      // header("location: https://media.apertura.photo/$userId/$randomFolder/$subfolder$photoFileId.jpg");
      exit();
    }
    else {
      require 'lib/amazon/aws-autoloader.php';

      $path = "$userId/$randomFolder/$subfolder$photoFileId.$extension";

      $s3 = new Aws\S3\S3Client([
        'credentials' => array(
          'key'       => S3_KEY,
          'secret'    => S3_SECRET
        ),
        'region' => 'us-east-1',
        'version' => 'latest'
      ]);

      $result = $s3->getObject(array(
        'Bucket' => S3_BUCKET,
        'Key' => $path
      ));
      header("Content-Type: {$result['ContentType']}");
      echo $result['Body'];
      exit();
    }
  }

  static function random_home_photos() {
    $userId = User::get_user_id_from_session();
    $randomPhotos = Photo::get_random_photos($userId, 15);
    $recentPhotos = Photo::get_most_recent_photos($userId, 15);
    $recentlyUploadedPhotos = Photo::get_recently_uploaded_photos($userId, 15);
    return array('randomPhotos' => $randomPhotos, 'recentPhotos' => $recentPhotos, 'recentlyUploadedPhotos' => $recentlyUploadedPhotos);
  }

  static function rotate_photo($photoFileId, $rotation) {
    if ($rotation != '90' && $rotation != '180' && $rotation != '270') {
      throw new Exception("Invalid rotation amount");
    }
    $photoFileId = db_escape($photoFileId);
    $sql = "SELECT filename FROM photoFiles WHERE id=$photoFileId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    if ($row) {
      $filename = $row['filename'];

      db_query("UPDATE photoFiles SET lastModified=NOW() WHERE id=$photoFileId");
      $result = db_query("SELECT UNIX_TIMESTAMP(lastModified) as lastModified FROM photoFiles WHERE id=$photoFileId");
      $newRow = db_fetch_assoc($result);

      PhotoManager::create_rotated_thumbnails_for_file($filename, $rotation);
      return array(
        'lastModified' => $newRow['lastModified']
      );
    }
    return false;
  }

  static function search($query) {
    $userId = User::get_user_id_from_session();
    $tags = Tag::get_tags_by_prefix($query, 1000);
    $mapfunc = function($tag) {
      return $tag['id'];
    };
    if (empty($tags)) {
      return [];
    }

    $tag_ids = array_map($mapfunc, $tags);
    $tag_id_string = implode(',', $tag_ids);

    $photos = [];
    $sql = "select p.dateTaken, pf.id, pf.photoId, pf.filename, pf.originalFilename, UNIX_TIMESTAMP(pf.lastModified) as lastModified, t.id as tagId, t.tagName
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      left join photoTags as pt on pf.id=pt.photoFileId
      left join tags as t on pt.tagId=t.id
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'
      and pf.id in (
        select photoFileId
        from photoFiles as pf
        inner join photoTags as pt on pt.photoFileId=pf.id
        where pt.tagId in ($tag_id_string)
      )
      order by pf.id";
    $results = db_query($sql);
    $lastPhotoId = null;
    while ($row = db_fetch_assoc($results)) {
      if ($row['id'] == $lastPhotoId) {
        $photos[count($photos)-1]['tags'][] = array('id' => $row['tagId'], 'tagName' => $row['tagName']);
      }
      else {
        $row['tags'] = [];
        if ($row['tagName']) {
          $row['tags'][] = array('id' => $row['tagId'], 'tagName' => $row['tagName']);
        }
        unset($row['tagId']);
        unset($row['tagName']);
        $photos[] = $row;
      }
      $lastPhotoId = $row['id'];
    }
    return $photos;
  }

  static function update_photo_date($photoId, $dateTaken) {
    $userId = User::get_user_id_from_session();
    if (!is_numeric($photoId)) {
      throw new Exception("Invalid photoId");
    }
    $dateTakenStr = db_escape($dateTaken);
    $sql = "UPDATE photos SET dateTaken='$dateTakenStr'
      where userId=$userId
      and id=$photoId";
    db_query($sql);
    return true;
  }

  /*
  static function convert_raw() {
    $filename = 'L1004235.DNG';
    $filebase = substr($filename, 0, strrpos($filename, '.'));
    $jpgFilename = $filebase . '.jpg';
    $output = "Converting $filename to $jpgFilename\r\n";
    chdir("/home/madisonavenueinc/uploads/apertura.photo");
    if (file_exists("test/$filename")) {
      $output .= "file exists\r\n";
      $output .= PhotoManager::convert_raw_to_jpg("test/$filename", "test/$jpgFilename");
      $output .= "\r\ndone.";
      //return $output;
      header("Content-type: image/jpg");
      echo file_get_contents("test/$jpgFilename");
      exit();
    }
    throw new Exception("RAW file doesn't exist in test path");
  }*/

  static function upload_photo($base64Photo, $originalFilename, $fileType, $uploadToken, $dateTaken, $cameraModel) {
    $userId = User::get_user_id_from_session();
    if (!$userId || !is_numeric($userId)) {
      $userId = User::get_user_from_upload_token($uploadToken);
    }
    if (!$userId) {
      // error_log("Unauthorized upload (401)", $originalFilename, $fileType, $uploadToken, $dateTaken, $cameraModel);
      throw new Exception("Unauthorized upload ($originalFilename, $fileType, $uploadToken, $dateTaken, $cameraModel)", 401);
    }
    if (User::is_user_suspended($userId)) {
      throw new Exception("Expired subscription", 401);
    }
    if (!$originalFilename || !$fileType) {
      throw new Exception("Missing information: $originalFilename, $fileType, $uploadToken, $dateTaken, $cameraModel", 400);
    }

    /*
    if ($userId == 1) {
      Error::log("$originalFilename: Authorized upload:$fileType,$dateTaken,$cameraModel");
    }
    */

    return PhotoManager::upload_photo($base64Photo, $originalFilename, $fileType, $uploadToken, $dateTaken, $cameraModel);
  }









  /**** PRIVATE ****/

  private static function get_random_recent_photos($userId, $limit) {
    if (!is_numeric($userId) || !is_numeric($limit)) {
      throw new Exception("Invalid arguments");
    }
    $mostRecentPoolSize = 50;
    $photos = [];
    $sql = "select p.dateTaken, pf.*
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where pf.photoId >= (select min(id) from (select id from photos where userId=$userId and status='active' order by id desc limit $mostRecentPoolSize) as tmp)
      and pf.status='active'
      and p.status='active'
      and p.userId=$userId
      order by RAND()
      limit $limit";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $photos[] = $row;
    }
    return $photos;
  }

  private static function get_most_recent_photos($userId, $limit) {
    if (!is_numeric($userId) || !is_numeric($limit)) {
      throw new Exception("Invalid arguments");
    }
    $photos = [];
    $sql = "select p.dateTaken, pf.*
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where pf.status='active'
      and p.status='active'
      and p.userId=$userId
      order by p.dateTaken desc
      limit $limit";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $photos[] = $row;
    }
    return $photos;
  }

  private static function get_recently_uploaded_photos($userId, $limit) {
    if (!is_numeric($userId) || !is_numeric($limit)) {
      throw new Exception("Invalid arguments");
    }
    $photos = [];
    $sql = "select p.dateTaken, pf.*
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where pf.status='active'
      and p.status='active'
      and p.userId=$userId
      $timeframeClause
      order by pf.dateUploaded desc
      limit $limit";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $photos[] = $row;
    }
    return $photos;
  }



  /*private static function get_random_untagged_photos($userId, $limit) {
    if (!is_numeric($userId) || !is_numeric($limit)) {
      throw new Exception("Invalid arguments");
    }
    $photos = [];
    $sql = "select p.dateTaken, pf.*
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'
      and pf.id not in (select distinct photoFileId from photoTags)
      order by rand()
      limit $limit";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $photos[] = $row;
    }
    return $photos;
  }

  private static function get_random_photos_without_date($userId, $limit) {
    if (!is_numeric($userId) || !is_numeric($limit)) {
      throw new Exception("Invalid arguments");
    }
    $photos = [];
    $sql = "select p.dateTaken, pf.*
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where p.userId=$userId
      and p.status='active'
      and pf.status='active'
      and p.dateTaken IS NULL
      order by rand()
      limit $limit";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $photos[] = $row;
    }
    return $photos;
  }*/

  private static function get_random_photos($userId, $limit) {
    if (!is_numeric($userId) || !is_numeric($limit)) {
      throw new Exception("Invalid arguments");
    }
    $photos = [];
    $sql = "select p.dateTaken, pf.*
      from photos as p
      inner join photoFiles as pf on p.id=pf.photoId
      where pf.status='active'
      and p.status='active'
      and p.userId=$userId
      and p.dateTaken IS NOT NULL
      order by RAND()
      limit $limit";
    $results = db_query($sql);
    while ($row = db_fetch_assoc($results)) {
      $photos[] = $row;
    }
    return $photos;
  }
}
