<?php
class PhotoManager {
  static function convert_raw_to_jpg($rawFilename, $jpgFilename) {
    exec(UPLOAD_PATH . "/dcraw -c $rawFilename | cjpeg -quality 100 -optimize -progressive > $jpgFilename", $output, $return_val);
  }

  static function create_guid() {
    $guid = '';
    $guid_chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','zf'];
    for ($i=0; $i<10; $i++) {
      $guid .= $guid_chars[rand(0, count($guid_chars)-1)];
    }
    return $guid;
  }

  static function get_image_size($binaryImageString, $imgRotate) {
    $img = imagecreatefromstring($binaryImageString);
    if ($img !== false) {
      $imgSize = ['width'=>imagesx($img), 'height'=>imagesy($img)];
      imagedestroy($img);
      if ($imgRotate < 0) {
        $imgRotate += 360;
      }
      if ($imgRotate == 90 || $imgRotate == 270) {
        $w = $imgSize['width'];
        $h = $imgSize['height'];
        $imgSize = ['width'=>$h,'height'=>$w];
      }
      return $imgSize;
    }
    return ['width'=>0,'height'=>0];
  }

  static function copy_photo_file_to_user($photoFileId, $userId) {
    $photoFileId = db_escape($photoFileId);
    $userId = db_escape($userId);

    if (PhotoManager::photo_file_exists_for_user($photoFileId, $userId)) {
      return;
    }

    $sql = "INSERT INTO photos
      (userId, dateTaken, cameraModel, status)
      SELECT $userId, dateTaken, cameraModel, 'active'
        from photos
        WHERE id=(SELECT photoId FROM photoFiles WHERE id=$photoFileId)";
    db_query($sql);
    $photoId = db_get_insert_id();

    $sql = "INSERT INTO photoFiles
      (photoId, format, filename, originalFilename, width, height, originalFileSize, totalFileSize, md5hash, sha1hash, status, dateUploaded)
      SELECT $photoId, format, filename, originalFilename, width, height, originalFileSize, totalFileSize, md5hash, sha1hash, 'active', NOW()
        FROM photoFiles
        WHERE id=$photoFileId";
    db_query($sql);

    $newPhotoFileId = db_get_insert_id();
    $sql = "SELECT id, filename, format FROM photoFiles where id=$newPhotoFileId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);

    $oldFilename = $row['filename'];
    $extension = $row['format'];
    $randomFolder = rand(0, 99);
    $newFilename = "$userId/$randomFolder/$newPhotoFileId.$extension";
    PhotoManager::copy_amazon_photo($oldFilename, $newFilename);

    $sql = "UPDATE photoFiles
      SET filename='$newFilename'
      WHERE id=$newPhotoFileId";
    db_query($sql);
  }

  static function photo_file_exists_for_user($photoFileId, $userId) {
    $photoFileId = db_escape($photoFileId);
    $userId = db_escape($userId);

    $sql = "SELECT mine.id
      FROM photoFiles as mine
      INNER JOIN photos as p on mine.photoId=p.id
      INNER JOIN photoFiles as theirs ON mine.md5hash=theirs.md5hash AND mine.sha1hash=theirs.sha1hash
      WHERE p.userId=$userId
      AND theirs.id=$photoFileId";
    $results = db_query($sql);
    $row = db_fetch_assoc($results);
    if ($row) {
      return true;
    }
    return false;
  }

  static function create_thumbnail($binaryImageString, $maxSide, $imgRotate) {
    $img = imagecreatefromstring($binaryImageString);
    if ($img !== false) {
      $width = $maxSide;
      $height = $maxSide;
      $ratio = imagesx($img) / imagesy($img);
      if ($ratio > 1) {
        $width = $maxSide;
        $height = $width / $ratio;
      }
      else {
        $height = $maxSide;
        $width = $maxSide * $ratio;
      }
      $thumbnail = imagecreatetruecolor($width, $height);
      imagecopyresampled($thumbnail, $img, 0, 0, 0, 0, $width, $height, imagesx($img), imagesy($img));
      imagedestroy($img);
      if ($imgRotate) {
        $thumbnail = PhotoManager::rotate_image($thumbnail, $imgRotate);
      }

      ob_start();
      imagejpeg($thumbnail, NULL, 100);
      $imageString = ob_get_clean();

      imagedestroy($thumbnail);

      return $imageString;
    }
  }

  static function rotate_image($image, $degrees) {
    if (!$degrees)
        return $image;
    if ($degrees == 180) {
      $image = imagerotate($image, 180, 0);
      return $image;
    }
    if ($degrees < 0) {
      $degrees += 360;
    }
    if ($degrees != 90 && $degrees != 270) {
      throw new Exception("rotate_image expects a 90, 180, or 270 degree angle");
    }
    $width = imagesx($image);
    $height = imagesy($image);
    $side = $width > $height ? $width : $height;
    $imageSquare = imagecreatetruecolor($side, $side);
    imagecopy($imageSquare, $image, 0, 0, 0, 0, $width, $height);
    imagedestroy($image);
    $imageSquare = imagerotate($imageSquare, $degrees, 0, -1);
    $image = imagecreatetruecolor($height, $width);
    $x = $degrees == 90 ? 0 : ($height > $width ? 0 : ($side - $height));
    $y = $degrees == 270 ? 0 : ($height < $width ? 0 : ($side - $width));
    imagecopy($image, $imageSquare, 0, 0, $x, $y, $height, $width);
    imagedestroy($imageSquare);
    return $image;
  }

  static function create_rotated_thumbnails_for_file($filename, $degrees) {
    $file_parts = explode('/', $filename);
    $userId = $file_parts[0];
    $randomFolder = $file_parts[1];
    $photoFilename = $file_parts[2];
    $photoFilename_parts = explode('.', $photoFilename);
    $photoFileId = $photoFilename_parts[0];
    $extension = $photoFilename_parts[1];

    require_once 'lib/amazon/aws-autoloader.php';

    $path = "$userId/$randomFolder/1920px/$photoFileId.jpg";

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

    if ($result['Body']) {
      $binaryImageString = $result['Body'];

      $largeBinary = PhotoManager::create_thumbnail($binaryImageString, 1920, $degrees);
      PhotoManager::upload_individual_file_to_amazon($s3, $largeBinary, "$userId/$randomFolder/1920px/$photoFileId.jpg", 'STANDARD');
      unset($largeBinary);

      $thumbBinary = PhotoManager::create_thumbnail($binaryImageString, 600, $degrees);
      PhotoManager::upload_individual_file_to_amazon($s3, $thumbBinary, "$userId/$randomFolder/600px/$photoFileId.jpg", 'STANDARD');
      unset($thumbBinary);

      unset($binaryImageString);
      return true;
    }
    else {
      throw new Exception("Couldn't retrieve image from media server.", 404);
    }
  }

  static function upload_photo_to_amazon($originalBinaryFile, $largeBinaryFile, $thumbnailBinaryFile, $userId, $randomFolder, $photoFileId, $extension) {
    require_once 'lib/amazon/aws-autoloader.php';

    $s3 = new Aws\S3\S3Client([
      'credentials' => array(
        'key'       => S3_KEY,
        'secret'    => S3_SECRET
      ),
      'region' => 'us-east-1',
      'version' => 'latest'
    ]);

    PhotoManager::create_amazon_bucket($s3, "$userId/");
    PhotoManager::create_amazon_bucket($s3, "$userId/$randomFolder/");
    PhotoManager::create_amazon_bucket($s3, "$userId/$randomFolder/600px/");
    PhotoManager::create_amazon_bucket($s3, "$userId/$randomFolder/1920px/");

    // upload full-size image
    if ($originalBinaryFile) {
      PhotoManager::upload_individual_file_to_amazon($s3, $originalBinaryFile, "$userId/$randomFolder/$photoFileId.$extension", 'STANDARD_IA');
    }

    if ($thumbnailBinaryFile) {
      PhotoManager::upload_individual_file_to_amazon($s3, $thumbnailBinaryFile, "$userId/$randomFolder/600px/$photoFileId.jpg", 'STANDARD');
    }

    if ($largeBinaryFile) {
      PhotoManager::upload_individual_file_to_amazon($s3, $largeBinaryFile, "$userId/$randomFolder/1920px/$photoFileId.jpg", 'STANDARD');
    }

    return true;
  }

  static function copy_amazon_photo($oldFilename, $newFilename) {
    require_once 'lib/amazon/aws-autoloader.php';

    $oldFilenameParts = explode('/', $oldFilename);
    $oldUserId = $oldFilenameParts[0];
    $oldRandomFolder = $oldFilenameParts[1];
    $oldExtension = substr($oldFilenameParts[2], strrpos($oldFilenameParts[2], '.') + 1);
    $oldPhotoFileId = substr($oldFilenameParts[2], 0, strrpos($oldFilenameParts[2], '.'));

    $oldFilename600 = "$oldUserId/$oldRandomFolder/600px/$oldPhotoFileId.jpg";
    $oldFilename1920 = "$oldUserId/$oldRandomFolder/1920px/$oldPhotoFileId.jpg";

    $newFilenameParts = explode('/', $newFilename);
    $userId = $newFilenameParts[0];
    $randomFolder = $newFilenameParts[1];
    $newExtension = substr($newFilenameParts[2], strrpos($newFilenameParts[2], '.') + 1);
    $newPhotoFileId = substr($newFilenameParts[2], 0, strrpos($newFilenameParts[2], '.'));

    $newFilename600 = "$userId/$randomFolder/600px/$newPhotoFileId.jpg";
    $newFilename1920 = "$userId/$randomFolder/1920px/$newPhotoFileId.jpg";

    $s3 = new Aws\S3\S3Client([
      'credentials' => array(
        'key'       => S3_KEY,
        'secret'    => S3_SECRET
      ),
      'region' => 'us-east-1',
      'version' => 'latest'
    ]);

    PhotoManager::create_amazon_bucket($s3, "$userId/");
    PhotoManager::create_amazon_bucket($s3, "$userId/$randomFolder/");
    PhotoManager::create_amazon_bucket($s3, "$userId/$randomFolder/600px/");
    PhotoManager::create_amazon_bucket($s3, "$userId/$randomFolder/1920px/");

    PhotoManager::copy_individual_amazon_file($s3, $oldFilename, $newFilename, 'STANDARD_IA');
    PhotoManager::copy_individual_amazon_file($s3, $oldFilename600, $newFilename600, 'STANDARD');
    PhotoManager::copy_individual_amazon_file($s3, $oldFilename1920, $newFilename1920, 'STANDARD');
  }

  static function create_amazon_bucket($s3, $bucket) {
    if (!$s3->doesObjectExist(S3_BUCKET, "$bucket")) {
      $s3->putObject(array(
        'Bucket' => S3_BUCKET,
        'Key'    => "$bucket",
        'Body'   => ""
      ));
    }
  }

  static function copy_individual_amazon_file($s3, $oldFilename, $newFilename, $storageClass) {
    $s3->copyObject(array(
      'ACL' => 'public-read',
      'Bucket' => S3_BUCKET,
      'Key' => $newFilename,
      'StorageClass' => $storageClass,
      'CopySource' => S3_BUCKET . "/$oldFilename"
    ));
  }

  static function upload_individual_file_to_amazon($s3, $binaryFile, $filename, $storageClass) {
    $s3->putObject(array(
      'Bucket' => S3_BUCKET,
      'Key'    => $filename,
      'StorageClass' => $storageClass,
      'ACL' => 'public-read',
      'Body'   => $binaryFile
    ));
  }

  static function is_common_image_type($fileType) {
    $ft = strtolower($fileType);
    if ($ft == 'image/jpg' || $ft == 'image/jpeg' || $ft == 'image/png' || $ft == 'image/gif'
      || $ft == 'image\/jpg' || $ft == 'image\/jpeg' || $ft == 'image\/png' || $ft == 'image\/gif') {
      return true;
    }
    return false;
  }

  static function upload_photo($base64Photo, $originalFilename, $fileType, $uploadToken, $dateTaken, $cameraModel) {
    set_time_limit(0);
    $userId = User::get_user_id_from_session();
    if (!$userId || !is_numeric($userId)) {
      $userId = User::get_user_from_upload_token($uploadToken);
    }
    if (!$userId) {
      throw new Exception("Unauthorized photo upload", 401);
    }

    if ($userId == 1) {
      ErrorLog::log("$originalFilename: Begin upload: $fileType, $dateTaken, $cameraModel");
    }

    if (!$base64Photo) {
      ErrorLog::log("$originalFilename had no base64 data POSTed, $userId");
      throw new Exception("Missing base64 data", 400);
    }

    // sanitize
    $extension = "jpg";
    if ($originalFilename && strrpos($originalFilename, '.') !== FALSE) {
      $extension = db_escape(strtolower(substr($originalFilename, strrpos($originalFilename, '.') + 1)));
    }
    if (!$originalFilename) {
      $originalFilename = "image.jpg";
    }
    $_originalFilename = db_escape($originalFilename);

    // convert base64 data to binary
    if (substr($base64Photo, 0, 5) == "data:") {
      $imgTypeStartPos = 5;
      $imgTypeEndPos = strpos($base64Photo, ';');
      $fileType = substr($base64Photo, $imgTypeStartPos, $imgTypeEndPos - $imgTypeStartPos);
      $base64Photo = substr($base64Photo, strpos($base64Photo, 'base64,')+7);
    }
    $originalBinaryFile = base64_decode($base64Photo);

    if (!$originalBinaryFile) {
      ErrorLog::log("After base64_decode, file is empty, $originalFilename, $userId");
      throw new Exception("Bad bas64 data", 400);
    }

    if ($userId == 1) {
      ErrorLog::log("$originalFilename: Base64 converted to binary.");
    }

    // md5 the binary data
    $md5hash = md5($originalBinaryFile);
    $sha1hash = sha1($originalBinaryFile);

    if ($userId == 1) {
      ErrorLog::log("$originalFilename: Comparing hashes: $md5hash | $sha1hash");
    }

    // compare the md5 hashes
    $sql = "SELECT pf.id, p.id as photoId, p.dateTaken, p.cameraModel
      FROM photoFiles as pf
      INNER JOIN photos as p on pf.photoId=p.id
      WHERE p.userId=$userId
      AND pf.md5hash='$md5hash' and pf.sha1hash='$sha1hash'";
    $uniqueFileResult = db_query($sql);
    $uniqueFileRow = db_fetch_assoc($uniqueFileResult);
    if ($uniqueFileRow) {
      if ($userId == 1) {
        ErrorLog::log("$originalFilename: Hashes found. Duplicate file.");
      }
      // if the existing photo is missing a dateTaken or cameraModel (due to some goofy crap I introduced and may introduce again in the future), update it
      if (!$uniqueFileRow['dateTaken'] && $dateTaken) {
        PhotoManager::update_photo_date($uniqueFileRow['photoId'], $dateTaken);
      }
      if (!$uniqueFileRow['cameraModel'] && $cameraModel) {
        PhotoManager::update_photo_camera_model($uniqueFileRow['photoId'], $cameraModel);
      }
      // This is a duplicate file.
      throw new Exception("This photo has already been uploaded: " . $uniqueFileRow['id'], 418);
    }

    if ($userId == 1) {
      ErrorLog::log("$originalFilename: Hashes not found, proceed to upload.");
    }

    // copy file temporarily
    $tmpFilename = PhotoManager::create_guid();
    if (!file_exists(TMP_PATH)) {
      mkdir(TMP_PATH);
    }
    $tmpPath = TMP_PATH . '/' . $tmpFilename . '.' . $extension;

    // write the tmp file
    $fh = fopen($tmpPath, "wb");
    fwrite($fh, $originalBinaryFile);
    fflush($fh);
    fclose($fh);
    clearstatcache();

    $originalFileSize = filesize($tmpPath);
    if ($originalFileSize == 0) {
      unlink($tmpPath);
      $base64substring = substr($base64Photo, 0, 15);
      throw new Exception("Failed to upload photo. Zero file size. $userId, $tmpFilename, $base64substring...", 500);
    }
    $totalFileSize = $originalFileSize;

    if ($userId == 1) {
      ErrorLog::log("$originalFilename: Temporary file written: $tmpPath");
    }

    // get EXIF
    $exif = PhotoManager::get_exif($tmpPath, $fileType);
    if ($dateTaken) {
      $dateString = date("Y-m-d H:i:s", strtotime($dateTaken));
    }
    else if ($exif['dateString']) {
      $dateString = $exif['dateString'];
    }
    if ($exif['cameraModel']) {
      $cameraModel = $exif['cameraModel'];
    }
    $imgRotate = $exif['imgRotate'];

    if ($userId == 1) {
      ErrorLog::log("$originalFilename: Exif: " . json_encode($exif));
    }

    $_cameraModel = db_escape($cameraModel);

    // test if this is another version of an existing photo
    if ($dateString && $cameraModel) {
      $sql = "SELECT id FROM photos WHERE userId=$userId AND dateTaken='$dateString' AND cameraModel='$_cameraModel'";
      $uniquePhotoResult = db_query($sql);
      $uniquePhotoRow = db_fetch_assoc($uniquePhotoResult);
      if ($uniquePhotoRow) {
        // same photo, different version?
        $photoId = $uniquePhotoRow['id'];
      }
    }

    if (!$photoId) {
      if (!$dateString) {
        $dateString = "NULL";
      }
      else {
        $dateString = "'$dateString'";
      }

      if ($userId == 1) {
        ErrorLog::log("$originalFilename: insert into photos: $dateString,$cameraModel," . json_encode($exif));
      }

      // insert the photos record
      $sql = "insert into photos (userId, dateTaken, cameraModel) VALUES($userId, $dateString, '$_cameraModel')";
      db_query($sql);
      $photoId = db_get_insert_id();
    }

    if ($userId == 1) {
      ErrorLog::log("$originalFilename: insert into photofiles:$originalFilename,$photoId");
    }

    // insert the photoFile record
    $sql = "insert into photoFiles (photoId, md5hash, sha1hash, format, filename, originalFilename, originalFileSize, status) VALUES($photoId, '$md5hash', '$sha1hash', '$extension', '', '$_originalFilename', $originalFileSize, 'pending')";
    db_query($sql);
    $photoFileId = db_get_insert_id();

    // determine a path to write the file
    $randomFolder = rand(0, 99);
    $relativePath = $userId . '/' . $randomFolder . '/' . $photoFileId . '.' . $extension;

    // write the file
    PhotoManager::upload_photo_to_amazon($originalBinaryFile, null, null, $userId, $randomFolder, $photoFileId, $extension);

    // convert to jpg and point to binary contents
    if (PhotoManager::is_common_image_type($fileType)) {
      // point to binary data
      $binaryFile = $originalBinaryFile;
    }
    else {
      // convert raw to jpg
      $thumbPath =  TMP_PATH . "/$tmpFilename.thumb.jpg";
      PhotoManager::convert_raw_to_jpg($tmpPath, $thumbPath);

      if (file_exists($thumbPath) && filesize($thumbPath)) {
        $binaryFile = file_get_contents($thumbPath);
        unlink($thumbPath);
      }
      else {
        throw new Exception("Couldn't convert raw file to jpg: $photoFileId, $extension, $tmpPath, $thumbPath", 500);
      }
    }
    unlink($tmpPath);

    if ($binaryFile) {
      // get width & height
      $imgSize = PhotoManager::get_image_size($binaryFile, $imgRotate);

      // create 600px thumbnail
      $thumbnailBinaryFile = PhotoManager::create_thumbnail($binaryFile, /*$thumbPath . '/' . $photoFileId . '.jpg',*/ 600, $imgRotate);
      $fh = fopen($tmpPath, "wb");
      fwrite($fh, $thumbnailBinaryFile);
      fclose($fh);
      $totalFileSize += filesize($tmpPath);
      unlink($tmpPath);
      PhotoManager::upload_photo_to_amazon(null, null, $thumbnailBinaryFile, $userId, $randomFolder, $photoFileId, $extension);
      unset($thumbnailBinaryFile);

      // 1920px thumbnail
      $largeBinaryFile = PhotoManager::create_thumbnail($binaryFile, /*$thumbPath . '/' . $photoFileId . '.jpg',*/ 1920, $imgRotate);
      $fh = fopen($tmpPath, "wb");
      fwrite($fh, $largeBinaryFile);
      fclose($fh);
      $totalFileSize += filesize($tmpPath);
      unlink($tmpPath);
      PhotoManager::upload_photo_to_amazon(null, $largeBinaryFile, null, $userId, $randomFolder, $photoFileId, $extension);
      unset($largeBinaryFile);

      $sql = "UPDATE photoFiles SET filename='$relativePath', width='{$imgSize['width']}', height='{$imgSize['height']}', totalFileSize=$totalFileSize, status='active' where id=$photoFileId";
      db_query($sql);
    }

    // return successfully
    return [photoId => $photoId, photoFileId => $photoFileId, src => $relativePath];
  }

  public static function update_photo_date($photoId, $dateTaken) {
    if (!$photoId) {
      return;
    }
    $dateString = date("Y-m-d H:i:s", strtotime($dateTaken));
    $sql = "UPDATE photos
      SET dateTaken='$dateString'
      WHERE id=$photoId";
    db_query($sql);
  }

  public static function update_photo_camera_model($photoId, $cameraModel) {
    if (!$photoId) {
      return;
    }
    $_cameraModel = db_escape($cameraModel);
    $sql = "UPDATE photos
      SET cameraModel='$_cameraModel'
      WHERE id=$photoId";
    db_query($sql);
  }

  private static function get_exif($path, $fileType) {
    // get EXIF
    $imgRotate = 0;
    $timestamp = null;
    if (PhotoManager::is_common_image_type($fileType)) {
      $exifTime = trim(exec("identify -format %[EXIF:DateTimeOriginal] $path"));
      if ($exifTime && $exifTime != '') {
        $timestamp = strtotime($exifTime);
      }
      $cameraModel = exec("identify -format %[EXIF:Model] $path");
      $orientation = trim(exec("identify -format %[EXIF:Orientation] $path"));
      switch($orientation) {
        case '8': $imgRotate = 90; break;
        case '3': $imgRotate = 180; break;
        case '6': $imgRotate = 270; break;
        case '1':
        default:
          break;
      }
    }
    else {
      $output = exec(UPLOAD_PATH . "/dcraw -i -v $path", $exif);
      for ($i=0; $i<count($exif); $i++) {
        $pos = strpos($exif[$i], ':');
        $key = substr($exif[$i], 0, $pos);
        $value = substr($exif[$i], $pos+1);
        switch (trim($key)) {
          case "Camera":
            $cameraModel = trim($value);
            break;
          case "Timestamp":
            if (trim($value)) {
              $timestamp = strtotime(trim($value));
            }
            break;
          case "Output size":
            $parts = explode('x', trim($value));
            $imgWidth = trim($parts[0]);
            $imgHeight = trim($parts[1]);
            if ($imgHeight > $imgWidth) {
              $imgRotate = 90;
            }
            break;
          default:
            break;
        }
      }
    }
    $dateString = null;
    if ($timestamp && $timestamp != null) {
      $dateString = date("Y-m-d H:i:s", $timestamp);
    }

    if (!$dateString || substr($dateString, 0, 4) == '1970') {
      ErrorLog::log("Couldn't find EXIF date for photo:\$dateString:$dateString,\$dateTaken:$dateTaken,\$timestamp:$timestamp");
    }

    return array(
      'dateString' => $dateString,
      'cameraModel' => $cameraModel,
      'imgRotate' => $imgRotate
    );
  }
}
