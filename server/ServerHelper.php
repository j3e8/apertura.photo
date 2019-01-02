<?php
class ServerHelper {
  public static function require_https_for_namespace($namespace) {
    if ($namespace == 'main') {
      return;
    }
    if (!$_SERVER['HTTPS']) {
      header('location: https://' . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI']);
      exit();
    }
  }

  public static function serve_page($namespace, $page_str) {
    $page_str = preg_replace('/[^a-z0-9_\-\/]/i', '', $page_str);

    if (ServerHelper::page_requires_sign_in($namespace, $page_str)) {
      if (User::is_user_suspended() && !ServerHelper::is_requesting_renew_page($namespace, $page_str)) {
        header("location: renew");
        exit();
      }
      else if (!User::is_user_signed_in()) {
        header("location: signin");
        exit();
      }
    }

    if ($page_str == '')
      $page_str = 'home';

    if (!ServerHelper::page_exists($namespace, $page_str)) {
      $page_str = '404';
    }

    ServerHelper::output_page($namespace, $page_str);
  }

  public static function page_exists($namespace, $page_str) {
    if (file_exists(SITE_PATH . "/client/$namespace/pages/$page_str/$page_str.html"))
      return true;
    return false;
  }

  public static function output_page($namespace, $page_str) {
    if (file_exists(SITE_PATH . "/client/$namespace/pages/$page_str/$page_str.html")) {
      include(SITE_PATH . "/client/$namespace/pages/$page_str/$page_str.html");
    }
  }

  public static function page_requires_sign_in($namespace, $page_str) {
    if ($namespace == 'admin') {
      return true;
    }
    else if ($namespace == 'app') {
      $public_pages = array(
        'signin',
        'accept-invitation',
        'browse-shared-collection'
      );

      if (!in_array($page_str, $public_pages)) {
        return true;
      }
    }
    return false;
  }

  public static function needs_renewal() {
    if (!User::is_user_signed_in()) {
      return false;
    }
    if (User::is_user_signed_in()) {
      return true;
    }
    return false;
  }

  public static function is_requesting_renew_page($namespace, $page_str) {
    if ($namespace == 'app' && $page_str == 'renew') {
      return true;
    }
    return false;
  }

  public static function perform_api_method($class, $method) {
    global $_ARGS;

    header('Content-Type: text/json');
    $is_valid_method = false;
    if (class_exists($class)) {
      if (method_exists($class, $method)) {
        $is_valid_method = true;
        // read raw data from std in
        $json = file_get_contents('php://input');
        $data = json_decode($json);

        $reflector = new ReflectionClass($class);
        $req_parameters = $reflector->getMethod($method)->getParameters();

        $supplied_parameters = array();
        $i = 0;
        foreach ($req_parameters as $param) {
          $supplied_parameters[$i] = null;
          if (isset($data->{$param->name}))
            $supplied_parameters[$i] = $data->{$param->name};
          else if (isset($_ARGS[$param->name]))
            $supplied_parameters[$i] = $_ARGS[$param->name];
          $i++;
        }
        try {
          $response['results'] = call_user_func_array("$class::$method", $supplied_parameters);
          $response['success'] = 1;
          $response['message'] = 'OK';
        } catch (Exception $ex) {
          $code = $ex->getCode();
          if ($code != 401 && $code != 418) {
            ServerHelper::send_error("Error " . $ex->getCode() . "\r\n\r\n" . $ex->getMessage());
          }
          http_response_code($ex->getCode());
          $response['success'] = 0;
          $response['message'] = $ex->getMessage();
          $response['code'] = $ex->getCode();
        }
      }
    }
    if (!$is_valid_method) {
      http_response_code(400);
      $response = array('success'=>0, 'message'=>'Invalid method attempted.');
    }
    echo json_encode($response);
  }

  public static function serve_file($filename) {
    if (file_exists(DOWNLOADS_PATH . "/$filename")) {
      $_filename = db_escape($filename);
      $userId = User::get_user_id_from_session();
      if (!$userId) {
        $userId = "NULL";
      }
      $sql = "INSERT INTO filesDownloaded (userId, filename)
        VALUES($userId, '$_filename')";
      db_query($sql);
      header("Content-Type: application/octet-stream");
      header('Content-Disposition: attachment');
      echo file_get_contents(DOWNLOADS_PATH . "/$filename");
    }
  }

  private static function send_error($errorMessage) {
		mail("support@apertura.photo", "Server error", $errorMessage, "From: support@apertura.photo\r\n");
		return true;
  }
}
