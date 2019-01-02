<?php
	
	try {
		$mysqli = new mysqli("flooreight.cycj5r5gccpv.us-west-2.rds.amazonaws.com", "jpix", "a!asDf#sj9vW", "jpix");
	} catch (Exception $ex) {
		echo $ex->getMessage();
		exit();
	}
		
	function db_query($sql) {
		global $mysqli;
		$success = $mysqli->query($sql);
		if (!$success) {
			$backtrace = debug_backtrace();
			if (!empty($backtrace) && count($backtrace) > 1) {
				$class = $backtrace[1]['class'];
				$method = $backtrace[1]['function'];
				$debugstr = $class . '::' . $method;
			}
			throw new Exception("Invalid SQL query ($debugstr)");
		}
		return $success;
	}
	
	function db_fetch_assoc($result) {
		if ($result === FALSE)
			return FALSE;
		return $result->fetch_assoc();
	}
	
	function db_get_insert_id() {
		global $mysqli;
		return $mysqli->insert_id;
	}
	
	function db_free($result) {
		$result->free();
	}
	
	function db_escape($str) {
		global $mysqli;
		return $mysqli->real_escape_string($str);
	}

	function db_get_last_error() {
		global $mysqli;
		return $mysqli->error;
	}

	function db_null_or_string($str) {
		if (!$str || $str == '')
			return 'NULL';
		else
			return "'" . db_escape($str) . "'";
	}
?>
