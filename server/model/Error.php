<?php
class Error {
	public static function upload_log($logData) {
		mail("support@apertura.photo", "Error log from user", $logData, "From: support@apertura.photo\r\n");
		return true;
	}

	public static function thumbnail_error($filename) {
		list($path, $querystring) = explode('?', $filename);
		list($userId, $randomFolder, $photoFilename, $size) = explode('/', $path);
		list($photoFileId, $extension) = explode('.', $photoFilename);

		$sql = "SELECT id FROM thumbnailErrors WHERE photoFileId=$photoFileId AND status='pending'";
		$result = db_query($sql);
		$row = db_fetch_assoc($result);
		if (!$row) {
			$sql = "INSERT INTO thumbnailErrors (photoFileId) VALUES($photoFileId)";
			db_query($sql);
		}
		return true;
	}

	public static function send_error($errorMessage) {
		mail("support@apertura.photo", "Server error", $errorMessage, "From: support@apertura.photo\r\n");
		return true;
	}
	public static function log($errorMessage) {
		error_log($errorMessage . "\n", 3, ERROR_LOG);
	}
}

