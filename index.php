<?php

/* Optimize number of results, user likely not interested in many results */
const MAX_RESULTS = 1000;

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

function searchAcronyms($pattern) {
       try {
              $db = new AcronymsDB();
       } catch (Exception $e) {
              exit($e);
       }
       
       // User is most likely looking for a specific acronym, why bother processing thousands records
       $max_results = (string)MAX_RESULTS;

       if (strlen($pattern) == 0) {
              $sqls = array(
                     "SELECT * FROM acronyms ORDER BY name LIMIT $max_results;"
              );
       } else {
              $pattern = AcronymsDB::escapeString($pattern);
              $sqls = array(
                     "SELECT * FROM acronyms WHERE name LIKE '%$pattern%' LIMIT $max_results;",
                     "SELECT * FROM acronyms WHERE tags LIKE '%$pattern%' LIMIT $max_results;",
                     "SELECT * FROM acronyms WHERE expanded LIKE '%$pattern%' LIMIT $max_results;",
                     "SELECT * FROM acronyms WHERE description LIKE '%$pattern%' LIMIT $max_results;"
              );
       }
       
       $ids = array();
       $matches = array();
       foreach ($sqls as &$sql) {
              if (count($ids) >= MAX_RESULTS) {
                     break;
              }
       
              $result = $db->query($sql);
              if ($result) {
                     while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                            if (!in_array($row["id"], $ids)) {
                                   $row["tags"] = explode(",", $row["tags"]);
       
                                   array_push($ids, $row["id"]);
                                   array_push($matches, $row);
                            }
                     }
              }
       }
       return json_encode($matches, JSON_PRETTY_PRINT);
}

$search = "";
if (in_array("search", array_keys($_REQUEST))) {
       header("Content-Type: application/json; charset=UTF-8");
       echo searchAcronyms($_REQUEST["search"]);
} else {
       header("Content-Type: text/html; charset=UTF-8");
       $fp = fopen(INDEX_HTML, "rb");
       fpassthru($fp);
}

?>
