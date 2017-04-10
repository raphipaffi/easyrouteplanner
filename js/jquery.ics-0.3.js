/**
 * jQuery icalendar processing plugin
 *
 * Version: 0.3
 *
 * Author: Michael Sieber
 * Web: http://www.bitfish.eu
 *
 * Licensed under
 *   MIT License http://www.opensource.org/licenses/mit-license
 *
 * Implementation resources:
 *		- http://tools.ietf.org/html/rfc5545
 * 		- http://upload.wikimedia.org/wikipedia/commons/c/c0/ICalendarSpecification.png
 *
 *  Version History:
 *		- 0.3 Changed tzname for standard and daylight timezone from mandatory to optional
 */
(function($){

	/**
	* Parse an ics file
	* @param url The url to the ics file which should be parsed
	* @return object tree with the values of the parsed ics files
	* @throws Error message if parsing fails or the file could not be loaded
	*/
	$.parseIcs = function(url) {
		if(!icsExists(url)){
			throw "Unable to load file from: " + url;
		}
		
		return parse(url);
	};
	
	/**
	* Check if a given ics file exists and is therefore available for further processing.
	* @param url The file url to check
	* @return boolean if the ics files exists, false if not or if any error occurs
	*/
	function icsExists(url){
		if(url){
			var response = $.ajax({
				url: url,
				type: 'HEAD',
				async: false
			}).status;
			
			return (response == "200");
		}
		
		return false;
	}
	
	/**
	* Start parsing the ics calendar.
	* @param url The url where the calendar is located.
	* @return object tree with the values of the parsed ics files
	* @throws error if parsing fails or the file couldn't be loaded
	*/
	function parse(url){
		var cal = {};
		cal['event'] = [];
		cal['todo'] = [];
		cal['journal'] = [];
		cal['freebusy'] = [];
		cal['timezone'] = {};
		
		// open the ics file
		$.ajax({
			url: url,
			dataType: 'text',
			async: false,
			success: function(data){
                // first remove sequences of (CRLF+single white space) from data (marking long lines)
                data = data.replace(/(\r\n\t)|(\r\n )/g,"");

				// content lines are delimited by a line break, which is a CRLF sequence
				// RFC 5545: 3.1 Content Lines, Page 9
				var file = data.split('\u000d\u000a');
				var idx = parseCalendar(file, cal, 0);
				
				// check if at least one main object has an entry
				if(!(cal['event'].length > 0 || cal['todo'].length > 0 || cal['journal'].length > 0 || 
						cal['freebusy'].length > 0 || typeof cal['timezone'].type != 'undefined')) {
					throw "At least one main object (event, todo, journal, freebusy or timezone) has to be set.";
				}
				
				// skip empty lines at the end of the file
				while(file[idx] == ""){
					idx++;
				}
				
				// check if the whole file has bee processed
				if(idx != file.length){
					throw "Unable to process the whole ics file.";
				}
			}
		});
		
		return cal;
	}
	
	/**
	* Parse the calendar object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseCalendar(file, parent, idx){
		if(!(file[idx] == 'BEGIN:VCALENDAR')){
			throw "Syntax error: No BEGIN:VCALENDAR found.";
		}
		idx++;
		
		parent.type = "VCALENDAR";

        var properties = {
                "calscale": {
                    min: 0,
                    max: 1
                },
                "method": {
                    min: 0,
                    max: 1
                },
                "prodid": {
                    min: 0,
                    max: 1
                },
                "version": {
                    min: 1,
                    max: 1
                },
                "x-prop": {
                    min: 0,
                    max: 1
                }
            };

		while(idx < file.length){
			var lineObj = splitLine(file[idx]);
			
			if(lineObj.name != "END" && lineObj.name != "BEGIN"){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    parent[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!parent[lineObj.name.toLowerCase()])
                    	parent[lineObj.name.toLowerCase()] = [];
                    parent[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: parent, props: properties });
		
		// let's start with content parsing
		while(idx < file.length){
			var line = file[idx].split(":");
			var prop = line[0];
			var val = line[1];
			
			if(prop == "BEGIN"){
				switch(val){
					case "VEVENT":
						idx = parseEvent(file, parent.event, idx);
						break;
					case "VTODO":
						idx = parseTodo(file, parent.todo, idx);
						break;
					case "VJOURNAL":
						idx = parseJournal(file, parent.journal, idx);
						break;
					case "VFREEBUSY":
						idx = parseFreebusy(file, parent.freebusy, idx);
						break;
					case "VTIMEZONE":
						idx = parseTimezone(file, parent.timezone, idx);
						break;
					default:
						break;
				}
			} else {
				break;
			}
		}
		
		if(!(file[idx] == 'END:VCALENDAR')){
			throw "Syntax error: No END:VCALENDAR found.";
		}
		
		return ++idx;
	}
	
	/**
	* Parse the event object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseEvent(file, parent, idx){
		if(!(file[idx] == 'BEGIN:VEVENT')){
			throw "Syntax error: No BEGIN:VEVENT found.";
		}
		idx++;
		
		var event = {};
		event.type = "VEVENT";

        var properties = {
            "attach":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "attendee":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "categories":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "class":
            {
                min: 0,
                max: 1
            },
            "comment":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "contact":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "created":
            {
                min: 0,
                max: 1
            },
            "description":
            {
                min: 0,
                max: 1
            },
            "dtend":
            {
                min: 1,
                max: 1,
                en: "duration"
            },
            "dtstamp":
            {
                min: 0,
                max: 1
            },
            "dtstart":
            {
                min: 0,
                max: 1
            },
            "duration":
            {
                min: 1,
                max: 1,
                en: "dtend"
            },
            "exdate":
            {
                min: 0,
                max: 1
            },
            "exrule":
            {
                min: 0,
                max: 1
            },
            "geo":
            {
                min: 0,
                max: 1
            },
            "last-mod":
            {
                min: 0,
                max: 1
            },
            "last-modified":
            {
                min: 0,
                max: 1
            },
            "location":
            {
                min: 0,
                max: 1
            },
            "organizer":
            {
                min: 0,
                max: 1
            },
            "priority":
            {
                min: 0,
                max: 1
            },
            "rdate":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "recurId":
            {
                min: 0,
                max: 1
            },
            "recurrence-id":
            {
                min: 0,
                max: 1
            },
            "related":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "resources":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "rrule":
            {
                min: 0,
                max: 1
            },
            "rstatus":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "sequence":
            {
                min: 0,
                max: 1
            },
            "seq":
            {
                min: 0,
                max: 1
            },
            "status":
            {
                min: 0,
                max: 1
            },
            "summary":
            {
                min: 0,
                max: 1
            },
            "transp":
            {
                min: 0,
                max: 1
            },
            "uid":
            {
                min: 0,
                max: 1
            },
            "url":
            {
                min: 0,
                max: 1
            },
            "x-prop":
            {
                min: 0,
                max: Number.MAX_VALUE
            }
        };

		while(idx < file.length){
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    event[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!event[lineObj.name.toLowerCase()])
                        event[lineObj.name.toLowerCase()] = [];
                    event[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else if (lineObj.name == "BEGIN" && lineObj.value == "VALARM") {
                event.alarm = {};
				idx = parseAlarm(file, event.alarm, idx);
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: event, props:properties });
		
		if(!(file[idx] == 'END:VEVENT')){
			throw "Syntax error: No END:VEVENT found.";
		}
		
		// add the event to the calendar
		parent.push(event);
		
		return ++idx;
	}
	
	/**
	* Parse the todo object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseTodo(file, parent, idx){
		if(!(file[idx] == 'BEGIN:VTODO')){
			throw "Syntax error: No BEGIN:VTODO found.";
		}
		idx++;
		
		var todo = {};
		todo.alarm = [];
		todo.type = "VTODO";

        var properties = {
            "attach":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "attendee":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "categories":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "class":
            {
                min: 0,
                max: 1
            },
            "comment":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "completed":
            {
                min: 0,
                max: 1
            },
            "contact":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "created":
            {
                min: 0,
                max: 1
            },
            "description":
            {
                min: 0,
                max: 1
            },
            "dtstamp":
            {
                min: 0,
                max: 1
            },
            "dtstart":
            {
                min: 0,
                max: 1
            },
            "due":
            {
                min: 1,
                max: 1,
                en: "duration"
            },
            "duration":
            {
                min: 1,
                max: 1,
                en: "due"
            },
            "exdate":
            {
                min: 0,
                max: 1
            },
            "exrule":
            {
                min: 0,
                max: 1
            },
            "geo":
            {
                min: 0,
                max: 1
            },
            "last-mod":
            {
                min: 0,
                max: 1
            },
            "location":
            {
                min: 0,
                max: 1
            },
            "organizer":
            {
                min: 0,
                max: 1
            },
            "percent":
            {
                min: 0,
                max: 1
            },
            "priority":
            {
                min: 0,
                max: 1
            },
            "rdate":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "recurId":
            {
                min: 0,
                max: 1
            },
            "related":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "resources":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "rrule":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "rstatus":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "seq":
            {
                min: 0,
                max: 1
            },
            "status":
            {
                min: 0,
                max: 1
            },
            "summary":
            {
                min: 0,
                max: 1
            },
            "uid":
            {
                min: 0,
                max: 1
            },
            "url":
            {
                min: 0,
                max: 1
            },
            "x-prop":
            {
                min: 0,
                max: Number.MAX_VALUE
            }
        };
		
		while(idx < file.length){
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    todo[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!todo[lineObj.name.toLowerCase()])
                        todo[lineObj.name.toLowerCase()] = [];
                    todo[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else if (lineObj.name == "BEGIN" && lineObj.value == "VALARM") {
				idx = parseAlarm(file, todo.alarm, idx);
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: todo, props: properties });
		
		if(!(file[idx] == 'END:VTODO')){
			throw "Syntax error: No END:VTODO found.";
		}
		
		// add the event to the calendar
		parent.push(todo);
		
		return ++idx;
	}
	
	/**
	* Parse the journal object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseJournal(file, parent, idx){
	if(!(file[idx] == 'BEGIN:VJOURNAL')){
			throw "Syntax error: No BEGIN:VJOURNAL found.";
		}
		idx++;
		
		var journal = {};
		journal.type = "VJOURNAL";

        var properties = {
            "attach":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "attendee":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "categories":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "class":
            {
                min: 0,
                max: 1
            },
            "comment":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "contact":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "created":
            {
                min: 0,
                max: 1
            },
            "description":
            {
                min: 0,
                max: 1
            },
            "dtstamp":
            {
                min: 0,
                max: 1
            },
            "dtstart":
            {
                min: 0,
                max: 1
            },
            "exdate":
            {
                min: 0,
                max: 1
            },
            "exrule":
            {
                min: 0,
                max: 1
            },
            "last-mod":
            {
                min: 0,
                max: 1
            },
            "organizer":
            {
                min: 0,
                max: 1
            },
            "rdate":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "recurId":
            {
                min: 0,
                max: 1
            },
            "related":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "rrule":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "rstatus":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "seq":
            {
                min: 0,
                max: 1
            },
            "status":
            {
                min: 0,
                max: 1
            },
            "summary":
            {
                min: 0,
                max: 1
            },
            "uid":
            {
                min: 0,
                max: 1
            },
            "url":
            {
                min: 0,
                max: 1
            },
            "x-prop":
            {
                min: 0,
                max: Number.MAX_VALUE
            }
        };

		while(idx < file.length){
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    journal[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!journal[lineObj.name.toLowerCase()])
                        journal[lineObj.name.toLowerCase()] = [];
                    journal[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: journal, props: properties });
		
		if(!(file[idx] == 'END:VJOURNAL')){
			throw "Syntax error: No END:VJOURNAL found.";
		}
		
		// add the event to the calendar
		parent.push(journal);
		
		return ++idx;
	}
	
	/**
	* Parse the free/busy object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseFreebusy(file, parent, idx){
		if(!(file[idx] == 'BEGIN:VFREEBUSY')){
			throw "Syntax error: No BEGIN:VFREEBUSY found.";
		}
		idx++;
		
		var freebusy = {};
		freebusy.type = "VFREEBUSY";

        var properties = {
            "attendee":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "comment":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "contact":
            {
                min: 0,
                max: 1
            },
            "dtend":
            {
                min: 0,
                max: 1
            },
            "dtstamp":
            {
                min: 0,
                max: 1
            },
            "dtstart":
            {
                min: 0,
                max: 1
            },
            "duration":
            {
                min: 0,
                max: 1
            },
            "freebusy":
            {
                min: 0,
                max: Number.MAX_VALUE
            },
            "organizer":
            {
                min: 0,
                max: 1
            },
            "rstatus":
            {
                min: 0,
                max: NUMBER.MAX_VALUE
            },
            "uid":
            {
                min: 0,
                max: 1
            },
            "url":
            {
                min: 0,
                max: 1
            },
            "x-prop":
            {
                min: 0,
                max: NUMBER.MAX_VALUE
            }
        };

		while(idx < file.length){		
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    freebusy[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!freebusy[lineObj.name.toLowerCase()])
                        freebusy[lineObj.name.toLowerCase()] = [];
                    freebusy[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: freebusy, props: properties });
		
		if(!(file[idx] == 'END:VFREEBUSY')){
			throw "Syntax error: No END:VFREEBUSY found.";
		}
		
		parent.push(freebusy);	
		return ++idx;
	}
	
	/**
	* Parse the timezone object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseTimezone(file, parent, idx){
		if(!(file[idx] == 'BEGIN:VTIMEZONE')){
			throw "Syntax error: No BEGIN:VTIMEZONE found.";
		}
		idx++;
		
		//var timezone = {};
        parent.type = "VTIMEZONE";
        parent.standard = {};
        parent.daylight = {};

        var properties = {
            "last-mod":
            {
                min: 0,
                max: 1
            },
            "tzid":
            {
                min: 1,
                max: 1
            },
            "tzurl":
            {
                min: 0,
                max: 1
            }
        };

		while(idx < file.length){		
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    parent[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!parent[lineObj.name.toLowerCase()])
                        parent[lineObj.name.toLowerCase()] = [];
                    parent[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else if (lineObj.name == "BEGIN" && lineObj.value == "STANDARD") {
				idx = parseStandard(file, parent.standard, idx);
			} else if (lineObj.name == "BEGIN" && lineObj.value == "DAYLIGHT") {
				idx = parseDaylight(file, parent.daylight, idx);
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: parent, props: properties });
		
		// check if at least one object is set
		if(!(typeof parent.standard.type != 'undefined' || typeof parent.daylight.type != 'undefined')){
			throw "VTIMEZONE needs at least one of STANDARD or DAYLIGHT to be set";
		}
		
		if(!(file[idx] == 'END:VTIMEZONE')){
			throw "Syntax error: No END:VTIMEZONE found.";
		}
		
		// add the event to the calendar
		//parent = timezone;
		
		return ++idx;
	}
	
	/**
	* Parse the alarm object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseAlarm(file, parent, idx){
		if(!(file[idx] == 'BEGIN:VALARM')){
			throw "Syntax error: No BEGIN:VALARM found.";
		}
		idx++;
		
		//var alarm = {};
        parent.type = "VALARM";
		
		while(idx < file.length){		
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
				//if(!alarm[lineObj.name.toLowerCase()]){
				//	alarm[lineObj.name.toLowerCase()] = [];
				//}
				//
				//// set the value to the property
				//alarm[lineObj.name.toLowerCase()].push(lineObj);

                // alarm objects don't contain any arrays
                parent[lineObj.name.toLowerCase()] = lineObj.value;
				idx++;
			} else {
				break;
			}
		}
		
		switch(parent.action.value){
			case "AUDIO":
				checkOccurence({
					obj: parent,
					props: {
                        "action": {
                            min: 1,
                            max: 1
                        },
                        "attach": {
                            min: 0,
                            max: 1
                        },
                        "duration": {
                            min: 0,
                            max: 1,
                            in: "repeat"
                        },
                        "repeat": {
                            min: 0,
                            max: 1,
                            in: "duration"
                        },
                        "trigger": {
                            min: 1,
                            max: 1
                        },
                        "tzurl": {
                            min: 0,
                            max: 1
                        }
                    }
				});
				break;
			case "DISPLAY":
				checkOccurence({
					obj: parent,
					props: {
                        "action": {
                            min: 1,
                            max: 1
                        },
                        "description": {
                            min: 1,
                            max: 1
                        },
                        "duration": {
                            min: 0,
                            max: 1,
                            in: "repeat"
                        },
                        "repeat": {
                            min: 0,
                            max: 1,
                            in: "duration"
                        },
                        "trigger": {
                            min: 1,
                            max: 1
                        },
                        "tzurl": {
                            min: 0,
                            max: 1
                        }
                    }
				});
				break;
			case "EMAIL":
				checkOccurence({
					obj: parent,
					props: {
                        "action": {
                            min: 1,
                            max: 1
                        },
                        "attach": {
                            min: 0,
                            max: Number.MAX_VALUE
                        },
                        "attendee": {
                            min: 1,
                            max: Number.MAX_VALUE
                        },
                        "description": {
                            min: 1,
                            max: 1
                        },
                        "duration": {
                            min: 0,
                            max: 1,
                            in: "repeat"
                        },
                        "repeat": {
                            min: 0,
                            max: 1,
                            in: "duration"
                        },
                        "summary": {
                            min: 1,
                            max: 1
                        },
                        "trigger": {
                            min: 1,
                            max: 1
                        },
                        "tzurl": {
                            min: 0,
                            max: 1
                        }
                    }
				});
				break;
			case "PROCEDURE":
				checkOccurence({
					obj: parent,
					props: {
                        "action": {
                            min: 1,
                            max: 1
                        },
                        "attach": {
                            min: 1,
                            max: 1
                        },
                        "description": {
                            min: 0,
                            max: 1
                        },
                        "duration": {
                            min: 0,
                            max: 1,
                            in: "repeat"
                        },
                        "repeat": {
                            min: 0,
                            max: 1,
                            in: "duration"
                        },
                        "trigger": {
                            min: 1,
                            max: 1
                        },
                        "tzurl": {
                            min: 0,
                            max: 1
                        }
                    }
				});
				break;
			default:
				throw "Unkown action '" + parent.action.name + "' for VALARM";
				break;
		}
		
		if(!(file[idx] == 'END:VALARM')){
			throw "Syntax error: No END:VALARM found.";
		}
		
		// add the event to the calendar
		//parent.push(alarm);
		
		return ++idx;
	}
	
	/**
	* Parse the standard object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseStandard(file, parent, idx){
		if(!(file[idx] == 'BEGIN:STANDARD')){
			throw "Syntax error: No BEGIN:STANDARD found.";
		}
		idx++;
		
		//var standard = {};
        parent.type = "STANDARD";

        var properties = {
            "dtstart": {
                min: 1,
                max: 1
            },
            "rrule": {
                min: 0,
                max: 1
            },
            "tzid": {
                min: 0,
                max: 1
            },
            "tzname": {
                min: 0,
                max: 1
            },
            "tzoffsetfrom": {
                min: 0,
                max: 1
            },
            "tzoffsetto": {
                min: 1,
                max: 1
            }
        };

		while(idx < file.length){		
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    parent[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!parent[lineObj.name.toLowerCase()])
                        parent[lineObj.name.toLowerCase()] = [];
                    parent[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: parent, props: properties });
		
		if(!(file[idx] == 'END:STANDARD')){
			throw "Syntax error: No END:STANDARD found.";
		}
		
		//parent.push(standard);
		return ++idx;
	}
	
	/**
	* Parse the daylight object.
	* @param file The ics file object
	* @param parent The parent calendar object to which the entries will be added
	* @param idx The current line index to process
	* @return int The next line index to process
	* @throws An error if the ics does not correspond to rfc 5545
	*/
	function parseDaylight(file, parent, idx){
		if(!(file[idx] == 'BEGIN:DAYLIGHT')){
			throw "Syntax error: No BEGIN:DAYLIGHT found.";
		}
		idx++;
		
		//var daylight = {};
        parent.type = "DAYLIGHT";

        var properties = {
            "dtstart": {
                min: 1,
                max: 1
            },
            "rrule": {
                min: 0,
                max: 1
            },
            "tzid": {
                min: 0,
                max: 1
            },
            "tzname": {
                min: 0,
                max: 1
            },
            "tzoffsetfrom": {
                min: 0,
                max: 1
            },
            "tzoffsetto": {
                min: 1,
                max: 1
            }
        };

		while(idx < file.length){		
			var lineObj = splitLine(file[idx]);
			
			if((lineObj.name != "END" && lineObj.name != "BEGIN")){
                if (typeof properties[lineObj.name.toLowerCase()] != 'undefined' && properties[lineObj.name.toLowerCase()].max == 1) {
                    parent[lineObj.name.toLowerCase()] = lineObj.value;
                }
                else {
                    if(!parent[lineObj.name.toLowerCase()])
                        parent[lineObj.name.toLowerCase()] = [];
                    parent[lineObj.name.toLowerCase()].push(lineObj);
                }
				idx++;
			} else {
				break;
			}
		}
		
		checkOccurence({ obj: parent, props: properties });
		
		if(!(file[idx] == 'END:DAYLIGHT')){
			throw "Syntax error: No END:DAYLIGHT found.";
		}
		
		//parent.push(daylight);
		return ++idx;
	}
	
	/**
	* Check the correct occurence of properties in a given object.
	* @param opt The option object check
	*				{
	*					obj: object, // the object on which the properties will be checked
	*					props: [
	*								{
	*									name: string, // the property name to check
	*									min: number, // the minimum occurence for this property
	*									max: number, // the maximum occurence for this property
	*									en: string, // Optional: the name of a property for excluding clarification (wheater, or)
	*									in: string, // Optional: the name of a property for including clarification (and)
	*								}
	*							]
	*				}
	* @throws An error if an occurence was violated
	*/
    function checkOccurence(opt){
        $.each(opt.props, function(propName, propValues){
            var prop = opt.obj[propName];

            // simple case: no dependecies to other properties
            if(!propValues.en && !propValues.in){

                // check for mandatory properties
                if(typeof prop === 'undefined' && propValues.min > 0){
                    throw "Property '" + propName + "' is mandatory for " + opt.obj.type;
                }

                if(typeof prop != 'undefined'){
                    // check occurence constraints
                    if(propValues.max == 1 && prop.constructor != Array){
                        return true;
                    }
                    else if(!(propValues.min <= prop.length && prop.length <= propValues.max)){
                        throw "Property '" + propName + "' occures too much/less on " + opt.obj.type;
                    }
                }
            } else {
                if(propValues.en){ // excluding clarification
                    // throw an error if the other property exists
                    if(prop && opt.obj[propValues.en] && opt.obj[propValues.en][0]){
                        throw "Property '" + propValues.en + "' is not allowed if property '" + propName + "' is set on " + opt.obj.type;
                    }
                } else if(propValues.in){ // including clarification
                    // throw an error if the other property does not exist
                    console.log(opt.obj);
                    if(!prop && !opt.obj[propValues.in] && !opt.obj[propValues.in][0]){
                        throw "Property '" + propName + "' needs the property '" + propValues.in + "' to be set on" + opt.obj.type;
                    }
                }
            }
        });
    }
	
	/**
	* Split a line into the property name, property parameters and the value.
	* @param line The line to split
	* @return object containing the property name, the property parameters and the value
	*			{
	*				name: string,
	*				value: string,
	*				params: [
	*							{
	*								key: string,
	*								value: string
	*							}
	*						]
	*			}
	*/
	function splitLine(line){
		var result = {};
		result.params = [];
		var seperatorIdx = line.indexOf(":");
		
		// get the value
		result.value = line.slice(seperatorIdx + 1, line.length);
		
		// get the parameters
		var props = line.slice(0, seperatorIdx).split(";");
		
		// first item is the property name
		result.name = props[0];
		
		for(var i = 1; i < props.length; i++){
			var param = {};
			var splittedParam = props[i].split("=");
			param.key = splittedParam[0];
			param.value = splittedParam[1];
			result.params.push(param);
		}
		
		return result;
	}
}(jQuery));
