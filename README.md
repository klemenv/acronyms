# Acronyms search engine

Too many acronyms? Can't remember the exact definition of one? The Acronyms project was started out of the same needs. When installed on your own web server, it provides a very simple search engine with a database backend. And in order to allow the database to grow, acronym records can be managed from the web interface as well.

## Installation

Example instructions for UNIX based web-server with shell access:

    wget https://github.com/klemenv/Acronyms/archive/refs/heads/main.zip
    mkdir -p -m 750 /var/www/html/acronyms/
    cd /var/www/html/acronyms/ 
    tar zxf Acronyms-main.zip --strip-components=1
    chown -R www-data:www-data .

The installation and configuration of the web server is outside the scope of this tutorial. However, a few instructions specific to this project are in place:

* Ensure the web server has PHP support. You can test this by pointing your browser to the acronyms.php file in the URL of your web server.
* Ensure that *acronyms.db* file and the folder itself are writable by the account user by the web server. The location of *acronyms.db* file can be changed to a more suitable location by changing the *db_path* field in *config.json* file.

## Usage

Typing into the search bar at the top will immediately trigger the query in the database. The query looks for short acronym, long definition, inside the description field and all the tags. It will try to show most relevant results first. The more characters user enters, the more relevant results should be. Search is limited to 100 results by default.

Tags can be used to group together acronyms from specific fields, and allow for quickly searching and selecting multiple acronyms at once. Tags are intended to be short names and easy to remember, but they can be acronym themselves.

External referencing for a specific search pattern is supported by appending the URL with a search pattern of choice. For example, https://192.168.1.77/acronyms/index.html?www will load the page and immediately search for term *www*.

A new acronym definition can be added by clicking on + sign next to the search input. Short acronym name and its long definition are required, all other fields are optional. Tags fields have auto-complete feature and are intended to help with grouping acronyms by using same tags.

Existing acronym can be updated by expanding the card and clicking on the edit icon. Acronym can be deleted when clicked on trash bin icon.

