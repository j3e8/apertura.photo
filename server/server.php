<?php
  session_start();
  date_default_timezone_set('UTC');
  ini_set('register_globals', false);

  $_ARGS = array();
  foreach ($_POST as $key => $value) {
    $_ARGS[$key] = $value;
  }
  foreach ($_GET as $key => $value) {
    $_ARGS[$key] = $value;
  }

  $namespace = $_ARGS['namespace'];
  if (!$namespace) {
    $namespace = 'main';
  }

  require_once('global_vars.php');
  require_once('ServerHelper.php');

  ServerHelper::require_https_for_namespace($namespace);

  $mode = 'page';
  $page_str = '';

  if (!isset($_ARGS['page']) && !isset($_ARGS['class']) && !isset($_ARGS['filename'])) {
    $mode = 'page';
    $page_str = '404';
  }
  elseif (isset($_ARGS['page'])) {
    $mode = 'page';
    $page_str = $_ARGS['page'];
  }
  elseif (isset($_ARGS['class'])) {
    $mode = 'action';
    $class = $_ARGS['class'];
    $method = $_ARGS['method'];
  }
  elseif (isset($_ARGS['filename'])) {
    $mode = 'file';
    $filename = $_ARGS['filename'];
  }

  if ($mode == 'page') {
    ServerHelper::serve_page($namespace, $page_str);
  }
  else if ($mode == 'action') {
    ServerHelper::perform_api_method($class, $method);
  }
  elseif ($mode == 'file') {
    ServerHelper::serve_file($filename);
  }

  require('lib/db_close.inc');
?>
