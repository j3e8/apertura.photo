<?php
class ErrorLog {
        public static function log($errorMessage) {
                error_log($errorMessage . "\n", 3, ERROR_LOG);
        }
}
