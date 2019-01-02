<?php
  require_once('lib/db.inc');

  define('SITE_PATH', '/var/www/html/apertura.photo');
  define('UPLOAD_PATH', '/var/www/tmp/apertura.photo');
  define('TMP_PATH', '/var/www/tmp/apertura.photo/tmp');
  define('DOWNLOADS_PATH', '/var/www/html/apertura.photo/downloads');

  define('DOMAIN', 'apertura.photo');
  define('SITE_ROOT', 'apertura.photo');

  define('S3_BUCKET', 'media.apertura.photo');
  define('S3_KEY', 'AKIAI2ECUTNCSUTJQFSA');
  define('S3_SECRET', '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');

  define('STRIPE_LIVE_PK', 'sk_live_WVgpoy6m7SHwWq6slGi32PDl');

  define('ERROR_LOG', '/var/www/logs/apertura.photo-error-log');

  function __autoload($class_name) {
    if (file_exists(SITE_PATH . "/server/model/$class_name.php")) {
     include SITE_PATH . "/server/model/$class_name.php";
    }
    else if (file_exists(SITE_PATH . "/server/lib/$class_name.php")) {
      include SITE_PATH . "/server/lib/$class_name.php";
    }
    else {
      $parts = explode("\\", $class_name);
      $path = implode("/", $parts);
      include SITE_PATH . "/server/lib/$path.php";
    }
  }
