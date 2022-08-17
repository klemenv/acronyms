<?php

/* Path to SQLite database file */
const DB_FILENAME = "acronyms.db";

/* Path to index.html file */
const INDEX_HTML = "index.html";

ini_set("display_errors", true);

class AcronymsDB extends SQLite3 {
       function __construct($filename=DB_FILENAME) {
              parent::__construct($filename);
       
              $create =<<<EOF
              CREATE TABLE IF NOT EXISTS acronyms (
                id INT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                expanded TEXT NOT NULL,
                tags TEXT,
                description TEXT,
                link TEXT,
                created INT NOT NULL,
                updated INT NOT NULL
              );
              CREATE TABLE IF NOT EXISTS tags (
                id INT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL
              );
              EOF;
              
              $result = parent::exec($create);
              if (!$result) {
                     parent::close();
                     throw new Exception("Unable to create database schema: " + $db->lastErrorMsg());
              }
       }

       function __desctruct() {
              parent::close();
       }
}

function searchAcronyms($pattern, $limit) {
       try {
              $db = new AcronymsDB();
       } catch (Exception $e) {
              exit($e);
       }
       
       // User is most likely looking for a specific acronym, why bother processing thousands records
       if ($limit > 0) {
              $sql_limit = " LIMIT " . (string)$limit;
       } else {
              $sql_limit = "";
       }

       if (strlen($pattern) == 0) {
              $sqls = array(
                     "SELECT * FROM acronyms ORDER BY name" . $sql_limit . ";",
              );
       } else {
              $pattern = AcronymsDB::escapeString($pattern);
              $sqls = array(
                     "SELECT * FROM acronyms WHERE name LIKE '%$pattern%'" . $sql_limit . ";",
                     "SELECT * FROM acronyms WHERE tags LIKE '%$pattern%'" . $sql_limit . ";",
                     "SELECT * FROM acronyms WHERE definition LIKE '%$pattern%'" . $sql_limit . ";",
                     "SELECT * FROM acronyms WHERE description LIKE '%$pattern%'" . $sql_limit . ";",
              );
       }
       
       $ids = array();
       $matches = array();
       foreach ($sqls as &$sql) {
              $result = $db->query($sql);
              if ($result) {
                     while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                            if ($limit > 0 && count($ids) >= $limit) {
                                   break;
                            }
              
                            if (!in_array($row["id"], $ids)) {
                                   $row["tags"] = explode(",", $row["tags"]);
       
                                   array_push($ids, $row["id"]);
                                   array_push($matches, $row);
                            }
                     }
              }
              if ($limit > 0 && count($ids) >= $limit) {
                     break;
              }
       }
       return json_encode($matches, JSON_PRETTY_PRINT);
}

$search = "";
if (in_array("search", array_keys($_REQUEST))) {
       if (in_array("limit", array_keys($_REQUEST))) {
              $limit = intval($_REQUEST["limit"]);
       } else {
              $limit = 0;
       }
       header("Content-Type: application/json; charset=UTF-8");
       echo searchAcronyms($_REQUEST["search"], $limit);
} else {
       header("Content-Type: text/html; charset=UTF-8");
       $fp = fopen(INDEX_HTML, "rb");
       fpassthru($fp);
}

?>
