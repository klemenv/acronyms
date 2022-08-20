<?php

/* Path to index.html file */
const INDEX_HTML = "index.html";

ini_set("display_errors", true);

class AcronymsDB extends SQLite3 {
    function __construct($filename) {
        parent::__construct($filename);
       
        $create =<<<EOF
              CREATE TABLE IF NOT EXISTS acronyms (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                definition TEXT NOT NULL,
                tags TEXT,
                description TEXT,
                link TEXT,
                created DATE DEFAULT (datetime('now', 'localtime')) NOT NULL,
                updated DATE DEFAULT NULL,
                deleted DATE DEFAULT NULL
              );
        EOF;
              
        $result = parent::exec($create);
        if (!$result) {
            parent::close();
            throw new Exception("Unable to create database schema: " + $this->lastErrorMsg());
        }
    }

    function __desctruct() {
        parent::close();
    }

    function matchAcronyms($pattern="", $limit=0) {
        $pattern = AcronymsDB::escapeString($pattern);
        $sql = "SELECT DISTINCT id,name,definition,description,tags,link FROM acronyms " .
               "WHERE deleted is NULL AND " .
               "      (name LIKE '%$pattern%' OR tags LIKE '%$pattern%' OR definition LIKE '%$pattern%' OR description LIKE '%$pattern%')" .
               "ORDER BY name,definition";

        if ($limit > 0) {
            $sql .= " LIMIT " . (string)$limit . ";";
        } else {
            $sql .= ";";
        }

        $matches = array();
        $result = $this->query($sql);
        if ($result) {
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                if ($row["tags"]) {
                    $row["tags"] = explode(",", $row["tags"]);
                }

                array_push($matches, $row);
            }
        }

        return json_encode($matches, JSON_PRETTY_PRINT);
    }

    function getAcronym($id) {
        if (!is_numeric($id)) {
            return formatJsonStatus("Invalid acronym id");
        }
        $id = intval($id);

        $sql = "SELECT id,name,definition,description,tags,link FROM acronyms " .
               "WHERE deleted is NULL AND id=$id;";

        $result = $this->query($sql);
        if ($result) {
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                if ($row["tags"]) {
                    $row["tags"] = explode(",", $row["tags"]);
                }

                return json_encode($row, JSON_PRETTY_PRINT);
            }
        }

        return formatJsonStatus("Not found");
    }

    function getTags($pattern="", $limit=0) {

        $pattern = AcronymsDB::escapeString($pattern);
        $sql = "WITH RECURSIVE split(value, str) AS (" .
               "  SELECT NULL,tags||',' FROM acronyms WHERE tags IS NOT NULL" .
               "  UNION ALL " .
               "  SELECT" .
               "    substr(str, 0, instr(str, ','))," .
               "    substr(str, instr(str, ',')+1)" .
               "    FROM split WHERE str!=''" .
               ") SELECT DISTINCT value FROM split WHERE value LIKE '$pattern%';";

        $matches = array();
        $result = $this->query($sql);
        if ($result) {
            while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
                array_push($matches, $row['value']);
            }
        }

        return json_encode($matches, JSON_PRETTY_PRINT);
    }

    function addAcronym($data) {
        $required = [ "name", "definition" ];
        $optional = [ "description", "link", "tags" ];

        $values = array();
        foreach (array_merge($required, $optional) as &$key) {
            if (in_array($key, array_keys($data))) {
                if (is_array($data[$key])) {
                    $values[":".$key] = implode(",", $data[$key]);
                } else {
                    $values[":".$key] = $data[$key];
                }
            } else if (in_array($key, $required)) {
                return formatJsonStatus("Missing required key: " . $key);
            }
        }

        $names1 = implode(",", str_replace(":", "", array_keys($values)));
        $names2 = implode(",", array_keys($values));
        $sql = "INSERT INTO acronyms (" . $names1 . ") VALUES (" . $names2 . ");";

        $stmt = $this->prepare($sql);
        if ($stmt === false) {
            return formatJsonStatus("Failed to prepare SQL statement");
        }
        foreach($values as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        if ($stmt->execute() === false) {
            return formatJsonStatus("Failed to add new acronym");
        }

        $id = $this->lastInsertRowId();
        return formatJsonStatus([ "id" => $id ]);
    }

    function updateAcronym($id, $data) {
        if (!is_numeric($id)) {
            return formatJsonStatus("Invalid acronym id");
        }
        $id = intval($id);

        $required = [ "name", "definition" ];
        $optional = [ "description", "link", "tags" ];

        $values = array();
        $sets = "";
        foreach (array_merge($required, $optional) as &$key) {
            if (in_array($key, array_keys($data))) {
                if (is_array($data[$key])) {
                    $values[":".$key] = implode(",", $data[$key]);
                } else {
                    $values[":".$key] = $data[$key];
                }
                $sets .= "$key=:$key,";
            } else if (in_array($key, $required)) {
                return formatJsonStatus("Missing required key: " . $key);
            }
        }
        $sets .= "updated=datetime('now', 'localtime')";

        $sql = "UPDATE acronyms SET $sets WHERE id=:id;";
        $stmt = $this->prepare($sql);
        if ($stmt === false) {
            return formatJsonStatus("Failed to prepare SQL statement");
        }
        foreach($values as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(":id", $id);
        if ($stmt->execute() === false) {
            return formatJsonStatus("Failed to add new acronym");
        }

        return formatJsonStatus([ "id" => $id ]);
    }

    function removeAcronym($id) {
        if (!is_numeric($id)) {
            return formatJsonStatus("Invalid acronym id");
        }
        $id = intval($id);

        $sql = "UPDATE acronyms SET deleted=datetime('now', 'localtime') WHERE id=:id";
        $stmt = $this->prepare($sql);
        if ($stmt === false) {
            return formatJsonStatus("Failed to prepare SQL statement");
        }
        $stmt->bindValue(":id", $id, SQLITE3_INTEGER);
        $result = $stmt->execute();
        if ($stmt->execute() === false) {
            return formatJsonStatus("Failed to remove acronym");
        //} else if ($stmt->rowCount() == 0) {
          //return formatJsonStatus("No such acronym");
        }

        return formatJsonStatus([ "id" => $id ]);
    }
}

function formatJsonStatus($fields=[]) {
    $status = [ "status" => "ok" ];
    if (is_string($fields)) {
        $status["status"] = "error";
        $status["explanation"] = $fields;
    } else if (is_array($fields)) {
        foreach($fields as $key => $val) {
            $status[$key] = $val;
        }
    }

    return json_encode($status, JSON_PRETTY_PRINT);
}

$config = json_decode(file_get_contents("config.json"), false);
if (!$config) {
    echo formatJsonStatus("Missing or bad config.json file");
    exit(0);
}

if ($config->data_source == "sqlite") {
    try {
        $db = new AcronymsDB($config->db_path);
    } catch (Exception $e) {
        echo formatJsonStatus("Can't connect to database");
        exit(0);
    }
} else {
    echo formatJsonStatus("Invalid data source");
    exit(0);
}

if (in_array("search", array_keys($_GET))) {
    $pattern = $_GET["search"];
    if (in_array("limit", array_keys($_REQUEST))) {
        $limit = intval($_REQUEST["limit"]);
    } else {
        $limit = 0;
    }

    header("Content-Type: application/json; charset=UTF-8");
    echo $db->matchAcronyms($pattern, $limit);

} else if (in_array("get", array_keys($_GET))) {
    $id = $_GET["get"];

    header("Content-Type: application/json; charset=UTF-8");
    echo $db->getAcronym($id);

} else if (in_array("add", array_keys($_GET))) {
    $data = json_decode(file_get_contents("php://input"), true);

    header("Content-Type: application/json; charset=UTF-8");
    echo $db->addAcronym($data);

} else if (in_array("update", array_keys($_GET))) {
    $id = $_GET["update"];
    $data = json_decode(file_get_contents("php://input"), true);

    header("Content-Type: application/json; charset=UTF-8");
    echo $db->updateAcronym($id, $data);

} else if (in_array("remove", array_keys($_GET))) {
    $id = $_GET["remove"];

    header("Content-Type: application/json; charset=UTF-8");
    echo $db->removeAcronym($id);

} else if (in_array("tags", array_keys($_GET))) {
    $pattern = $_GET["tags"];

    header("Content-Type: application/json; charset=UTF-8");
    echo $db->getTags($pattern);

} else {
    header("Content-Type: text/html; charset=UTF-8");
    $fp = fopen(INDEX_HTML, "rb");
    fpassthru($fp);
}

?>
