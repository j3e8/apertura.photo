<?php
class General {
  public static function create_guid($length) {
    $guid = '';
    $guid_chars = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
    for ($i=0; $i<$length; $i++) {
      $guid .= $guid_chars[rand(0, count($guid_chars)-1)];
    }
    return $guid;
  }
}