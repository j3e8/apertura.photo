<?php
class Tag {

  static function delete_tag($id) {
    $userId = User::get_user_id_from_session();

    $sql = "DELETE FROM photoTags
      WHERE tagId=$id
      AND tagId IN (
        SELECT id FROM tags WHERE userId=$userId
      )";
    db_query($sql);

    $sql = "DELETE FROM tags WHERE id=$id AND userId=$userId";
    db_query($sql);

    return true;
  }

  static function merge_tags($sourceId, $destinationId) {
    $userId = User::get_user_id_from_session();

    $photos_with_both_tags = [];
    $sql = "select pt_src.photoFileId 
      from photoTags as pt_dest
      inner join photoTags as pt_src on pt_dest.photoFileId=pt_src.photoFileId
      where pt_src.tagId=$sourceId
      and pt_dest.tagId=$destinationId";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $photos_with_both_tags[] = $row['photoFileId'];
    }

    $exclusion_clause = '';
    if (!empty($photos_with_both_tags)) {
      $exclusion_clause = "AND photoFileId NOT IN (" . implode(',', $photos_with_both_tags) . ")";
    }

    $sql = "UPDATE photoTags
      SET tagId=$destinationId
      WHERE tagId=$sourceId
      AND tagId IN (
        SELECT id FROM tags WHERE userId=$userId
      ) $exclusion_clause";
    db_query($sql);

    $sql = "DELETE FROM tags WHERE id=$sourceId AND userId=$userId";
    db_query($sql);

    return array(
      'duplicates' => count($photos_with_both_tags)
    );
  }

  static function get_tag_info($id) {
    $userId = User::get_user_id_from_session();
    $id = db_escape($id);

    $sql = "SELECT tagName
      from tags
      where id=$id
      and userId=$userId";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      return $row;
    }
    return null;
  }

  static function get_tags_by_prefix($prefix, $limit) {
    $userId = User::get_user_id_from_session();
    if (!$userId || !is_numeric($userId)) {
      throw new Exception("Unauthorized tagging");
    }
    $prefix = db_escape($prefix);
    if (!is_numeric($limit)) {
      $limit = 5;
    }

    $tags = [];
    $sql = "SELECT id, tagName 
      from tags 
      where userId=$userId
      and tagName like '%$prefix%' 
      order by tagName 
      limit $limit";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $tags[] = $row;
    }
    return $tags;
  }

  static function get_tags_for_user() {
    $userId = User::get_user_id_from_session();

    $tags = [];
    $sql = "SELECT t.id, t.tagName, COUNT(pf.id) as totalPhotoFiles
      FROM tags as t
      INNER JOIN photoTags AS pt ON pt.tagId=t.id
      INNER JOIN photoFiles AS pf ON pt.photoFileId=pf.id
      WHERE t.userId=$userId
      AND pf.status='active'
      GROUP BY t.tagName";
    $result = db_query($sql);
    while ($row = db_fetch_assoc($result)) {
      $tags[] = $row;
    }
    return $tags;
  }

  static function remove_tag_from_photo($tagId, $photoFileId) {
    $userId = User::get_user_id_from_session();
    if (!$userId || !is_numeric($userId)) {
      throw new Exception("Unauthorized tagging");
    }
    $tagId = db_escape($tagId);
    $photoFileId = db_escape($photoFileId);

    $sql = "delete from photoTags
      where tagId=$tagId
      and photoFileId=$photoFileId
      and tagId in (
        select id from tags where userId=$userId
      )";
    db_query($sql);
    return true;
  }

  static function save_tag($photoFileId, $tag) {
    $userId = User::get_user_id_from_session();
    if (!$userId || !is_numeric($userId)) {
      throw new Exception("Unauthorized tagging");
    }

    if (!is_numeric($photoFileId)) {
      throw new Exception("Invalid Photo ID");
    }
    $_tag = db_escape($tag);
    $sql = "select id from tags where tagName='$_tag' and userId=$userId";
    $result = db_query($sql);
    if ($row = db_fetch_assoc($result)) {
      $tagId = $row['id'];
    }
    else {
      $sql = "insert into tags (tagName, userId) values('$_tag', $userId)";
      db_query($sql);
      $tagId = db_get_insert_id();
    }

    if (!is_numeric($tagId)) {
      throw new Exception("Invalid Tag ID");
    }
    $sql = "insert into photoTags
      (photoFileId, tagId)
      values($photoFileId, $tagId)";
    db_query($sql);
    return array('id' => $tagId, 'tagName' => $tag);
  }

  static function update_tag($id, $tagName) {
    $userId = User::get_user_id_from_session();
    $id = db_escape($id);
    $tagName = db_escape($tagName);
    $sql = "SELECT id FROM tags
      WHERE userId=$userId
      AND tagName='$tagName'
      AND id != $id";
    $result = db_query($sql);
    $row = db_fetch_assoc($result);
    if ($row) {
      throw new Exception("That tag is already in use", 406);
    }

    $sql = "UPDATE tags SET tagName='$tagName' WHERE userId=$userId AND id=$id";
    db_query($sql);

    return true;
  }

  static function collapse_tags_in_photo_results($results) {
    $photos = [];
    $lastPhotoId = null;
    for ($i=0; $i<count($results); $i++) {
      $row = $results[$i];

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
}