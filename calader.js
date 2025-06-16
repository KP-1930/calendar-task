function onCalendarEventOpen(event) {
  console.log('onCalendarEventOpen called', event);

  // let calendarEvent;

  // try {
  //   calendarEvent = Calendar.Events.get(event.calendar.calendarId, event.calendar.id);
  // } catch (err) {
  //   console.log(err);
  //   calendarEvent = undefined
  // }

  // console.log('calendarEvent', event);

  const eventCalendarData = event.calendar;

  if (!("canSetConferenceData" in eventCalendarData.capabilities)) {
    return buildCard();
  }


  if ("conferenceData" in eventCalendarData) {
    return buildCard();
  }

  return buildActionCard();
}

function onCalendarEventUpdate(event) {
  console.log('onCalendarEventUpdate called', event);

  if ("conferenceData" in event.calendar) {
    return buildCard();
  }

  return buildActionCard();
}

function onAddEducast(event) {
  console.log('onAddEducast > event', event);

  const eventData = event.calendar;
  const calendarId = eventData.calendarId;
  const eventId = eventData.id;

  let calendarEvent;
  try {
    calendarEvent = Calendar.Events.get(calendarId, eventId);
  } catch (err) {
    console.log(err);
    calendarEvent = {
      id: eventId,
    };
  }

  var conferenceInfo = create3rdPartyConference(calendarEvent);

  var dataBuilder = ConferenceDataService.newConferenceDataBuilder();

  if (!conferenceInfo.error) {

    if (conferenceInfo.videoUri) {
      var videoEntryPoint = ConferenceDataService.newEntryPoint()
        .setEntryPointType(ConferenceDataService.EntryPointType.VIDEO)
        .setUri(conferenceInfo.videoUri)
        .setMeetingCode(conferenceInfo.id);

      dataBuilder.addEntryPoint(videoEntryPoint)
        .setConferenceSolutionId('educasticConference')
        .setNotes(conferenceInfo.conferenceLegalNotice);
    }

  } else if (conferenceInfo.error === 'AUTH') {
    // Authenentication error. Implement a function to build the correct
    // authenication URL for the third-party conferencing system.
    var authenticationUrl = getAuthenticationUrl();
    var error = ConferenceDataService.newConferenceError()
      .setConferenceErrorType(
        ConferenceDataService.ConferenceErrorType.AUTHENTICATION)
      .setAuthenticationUrl(authenticationUrl);
    dataBuilder.setError(error);

  } else {
    // Other error type;
    var error = ConferenceDataService.newConferenceError()
      .setConferenceErrorType(
        ConferenceDataService.ConferenceErrorType.TEMPORARY);
    dataBuilder.setError(error);
  }

  // Don't forget to build the ConferenceData object.
  dataBuilder = dataBuilder.build();

  return CardService.newCalendarEventActionResponseBuilder()
    .setConferenceData(dataBuilder)
    .build();
}

function createConference(arg) {
  console.log('arg', arg);

  const eventData = arg.eventData;
  const calendarId = eventData.calendarId;
  const eventId = eventData.eventId;

  // Retrieve the Calendar event information using the Calendar Advanced service.
  var calendarEvent;
  try {
    calendarEvent = Calendar.Events.get(calendarId, eventId);
  } catch (err) {
    console.log(err);
    calendarEvent = {
      id: eventId,
    };
  }

  // Retrieve the Calendar event information using the Calendar
  // Advanced service.
  var calendarEvent;
  try {
    calendarEvent = Calendar.Events.get(calendarId, eventId);
  } catch (err) {
    // The calendar event does not exist just yet; just proceed with the
    // given event ID and allow the event details to sync later.
    console.log(err);
    calendarEvent = {
      id: eventId,
    };
  }

  // Create a conference on the third-party service and return the
  // conference data or errors in a custom JSON object.
  var conferenceInfo = create3rdPartyConference(calendarEvent);

  console.log('conferenceInfo', conferenceInfo)

  // Build and return a ConferenceData object, either with conference or
  // error information.
  var dataBuilder = ConferenceDataService.newConferenceDataBuilder();

  if (!conferenceInfo.error) {
    if (conferenceInfo.videoUri) {
      var videoEntryPoint = ConferenceDataService.newEntryPoint()
        .setEntryPointType(ConferenceDataService.EntryPointType.VIDEO)
        .setUri(conferenceInfo.videoUri)
        // .setPasscode(conferenceInfo.videoPasscode)
        .setMeetingCode(conferenceInfo.id);

      dataBuilder.addEntryPoint(videoEntryPoint)
        .setNotes(conferenceInfo.conferenceLegalNotice);
    }

    // Since the conference creation request succeeded, make sure that
    // syncing has been enabled.
    initializeSyncing(calendarId, eventId, conferenceInfo.id);

  } else if (conferenceInfo.error === 'AUTH') {
    // Authenentication error. Implement a function to build the correct
    // authenication URL for the third-party conferencing system.

    var state = ScriptApp.newStateToken()
        .withMethod('showConfigurationSidebar')
        .withTimeout(3600)
        .createToken();

    var authenticationUrl = 'https://script.google.com/a/google.com/d/'
        + ScriptApp.getScriptId()
        + '/usercallback?state='
        + state;

    // var authenticationUrl = getAuthenticationUrl();
    var error = ConferenceDataService.newConferenceError()
      .setConferenceErrorType(
        ConferenceDataService.ConferenceErrorType.AUTHENTICATION)
      .setAuthenticationUrl(authenticationUrl);
    dataBuilder.setError(error);

  } else {
    // Other error type;
    var error = ConferenceDataService.newConferenceError()
      .setConferenceErrorType(
        ConferenceDataService.ConferenceErrorType.TEMPORARY);
    dataBuilder.setError(error);
  }

  // Don't forget to build the ConferenceData object.
  return dataBuilder.build();
}


/**
 *  Contact the third-party conferencing system to create a conference there,
 *  using the provided calendar event information. Collects and retuns the
 *  conference data returned by the third-party system in a custom JSON object
 *  with the following fields:
 *
 *    data.adminEmail - the conference administrator's email
 *    data.conferenceLegalNotice - the conference legal notice text
 *    data.error - Only present if there was an error during
 *         conference creation. Equal to 'AUTH' if the add-on user needs to
 *         authorize on the third-party system.
 *    data.id - the conference ID
 *    data.phoneNumber - the conference phone entry point phone number
 *    data.phonePin - the conference phone entry point PIN
 *    data.videoPasscode - the conference video entry point passcode
 *    data.videoUri - the conference video entry point URI
 *
 *  The above fields are specific to this example; which conference information
 *  your add-on needs is dependent on the third-party conferencing system
 *  requirements.
 *
 * @param {Object} calendarEvent A Calendar Event resource object returned by
 *     the Google Calendar API.
 * @return {Object}
 */
function create3rdPartyConference(calendarEvent) {
  console.log('create3rdPartyConference > calendarEvent', calendarEvent)

  const apiKey = getPropertyData('API_KEY');
  if (!apiKey) {
    return { error: 'AUTH' };
  }

  const token = getPropertyData('API_KEY');
  const url = `${BASE_URL_API}/create/educast`;

  var formData = {
    'educast_google_event_id': calendarEvent.id
  };

  console.log('token', token)
  console.log('formData', formData)

  var options = {
    'muteHttpExceptions': true,
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    'payload': JSON.stringify(formData)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    console.log('result', result);
    if (result.error) {
      return result.error;
    }
    return result.data;
  } catch (e) {
    console.log('create3rdPartyConference', e)
    return { error: e };
  }
}

/**
 *  Return the URL used to authenticate the user with the third-party
 *  conferencing system.
 *
 *  @return {String}
 */
function getAuthenticationUrl() {
  var url = "https://educastic.com/";
  // Implementation details dependent on the third-party system.

  return url;
}

/**
 *  Initializes syncing of conference data by creating a sync trigger and
 *  sync token if either does not exist yet.
 *
 *  @param {String} calendarId The ID of the Google Calendar.
 */
function initializeSyncing(calendarId) {
  // Create a syncing trigger if it doesn't exist yet.
  createSyncTrigger(calendarId);

  // Perform an event sync to create the initial sync token.
  syncEvents({ 'calendarId': calendarId });
}

/**
 *  Creates a sync trigger if it does not exist yet.
 *
 *  @param {String} calendarId The ID of the Google Calendar.
 */
function createSyncTrigger(calendarId) {
  // Check to see if the trigger already exists; if does, return.
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++) {
    var trigger = allTriggers[i];
    if (trigger.getTriggerSourceId() == calendarId) {
      return;
    }
  }

  // Trigger does not exist, so create it. The trigger calls the
  // 'syncEvents()' trigger function when it fires.
  var trigger = ScriptApp.newTrigger('syncEvents')
    .forUserCalendar(calendarId)
    .onEventUpdated()
    .create();
}

/**
 *  Sync events for the given calendar; this is the syncing trigger
 *  function. If a sync token already exists, this retrieves all events
 *  that have been modified since the last sync, then checks each to see
 *  if an associated conference needs to be updated and makes any required
 *  changes. If the sync token does not exist or is invalid, this
 *  retrieves future events modified in the last 24 hours instead. In
 *  either case, a new sync token is created and stored.
 *
 *  @param {Object} e If called by a event updated trigger, this object
 *      contains the Google Calendar ID, authorization mode, and
 *      calling trigger ID. Only the calendar ID is actually used here,
 *      however.
 */
function syncEvents(e) {
  var calendarId = e.calendarId;
  var properties = PropertiesService.getUserProperties();
  var syncToken = properties.getProperty('syncToken');

  var options;
  if (syncToken) {
    // There's an existing sync token, so configure the following event
    // retrieval request to only get events that have been modified
    // since the last sync.
    options = {
      syncToken: syncToken
    };
  } else {
    // No sync token, so configure to do a 'full' sync instead. In this
    // example only recently updated events are retrieved in a full sync.
    // A larger time window can be examined during a full sync, but this
    // slows down the script execution. Consider the trade-offs while
    // designing your add-on.
    var now = new Date();
    var yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    options = {
      timeMin: now.toISOString(),          // Events that start after now...
      updatedMin: yesterday.toISOString(), // ...and were modified recently
      maxResults: 50,   // Max. number of results per page of responses
      orderBy: 'updated'
    }
  }

  // Examine the list of updated events since last sync (or all events
  // modified after yesterday if the sync token is missing or invalid), and
  // update any associated conferences as required.
  var events;
  var pageToken;
  do {
    try {
      options.pageToken = pageToken;
      events = Calendar.Events.list(calendarId, options);
    } catch (err) {
      // Check to see if the sync token was invalidated by the server;
      // if so, perform a full sync instead.
      if (err.message ===
        "Sync token is no longer valid, a full sync is required.") {
        properties.deleteProperty('syncToken');
        syncEvents(e);
        return;
      } else {
        throw new Error(err.message);
      }
    }

    // Read through the list of returned events looking for conferences
    // to update.
    if (events.items && events.items.length > 0) {
      for (var i = 0; i < events.items.length; i++) {
        var calEvent = events.items[i];
        // Check to see if there is a record of this event has a
        // conference that needs updating.
        console.log('calEvent', calEvent)
        if (eventHasConference(calEvent)) {
          updateConference(calEvent, calEvent.conferenceData.conferenceId);
        } else if(calEvent.status === 'cancelled') {
          deleteConference(calEvent.id);
        }
      }
    }

    pageToken = events.nextPageToken;
  } while (pageToken);

  // Record the new sync token.
  if (events.nextSyncToken) {
    properties.setProperty('syncToken', events.nextSyncToken);
  }
}

/**
 *  Returns true if the specified event has an associated conference
 *  of the type managed by this add-on; retuns false otherwise.
 *
 *  @param {Object} calEvent The Google Calendar event object, as defined by
 *      the Calendar API.
 *  @return {boolean}
 */
function eventHasConference(calEvent) {
  console.log('eventHasConference called')

  var name = calEvent.conferenceData?.conferenceSolution?.name || null;

  // This version checks if the conference data solution name matches the
  // one of the solution names used by the add-on. Alternatively you could
  // check the solution's entry point URIs or other solution-specific
  // information.
  console.log('eventHasConference > name', name)
  if (name) {
    if (name === "Educastic Meeting") {
      return true;
    }
  }
  return false;
}

/**
 *  Update a conference based on new Google Calendar event information.
 *  The exact implementation of this function is highly dependant on the
 *  details of the third-party conferencing system, so only a rough outline
 *  is shown here.
 *
 *  @param {Object} calEvent The Google Calendar event object, as defined by
 *      the Calendar API.
 *  @param {String} conferenceId The ID used to identify the conference on
 *      the third-party conferencing system.
 */
function updateConference(calEvent, conferenceId) {
  console.log('updateConference')

  const token = getPropertyData('API_KEY');
  const url = `${BASE_URL_API}/update/educast`;

  if(!token) {
    return false;
  }

  console.log('calEvent.attendees', calEvent.attendees)

  let attendeesEmails = [];
  if (calEvent.attendees) {
      calEvent.attendees.forEach((attendee) => {
          if (attendee.self) {
            return;
          }
          attendeesEmails.push(attendee.email);
      });
  }


  const formData = {
    id: calEvent.id,
    start: calEvent.start.dateTime,
    end: calEvent.end.dateTime,
    name: calEvent.summary,
    description: calEvent.description,
    attendees: attendeesEmails,
    status: calEvent.status
  }

  var options = {
    'muteHttpExceptions': true,
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    'payload': JSON.stringify(formData)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    console.log('result', result);
    if (result.error) {
      return result.error;
    }
    return result.data;
  } catch (e) {
    return { error: e };
  }
}

function deleteConference(eventId) {
  console.log('deleteConference', eventId)

  const token = getPropertyData('API_KEY');
  const url = `${BASE_URL_API}/delete/educast`;

  if(!token) {
    return false;
  }

  var formData = {
    'educast_google_event_id': eventId
  };

  var options = {
    'muteHttpExceptions': true,
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    'payload': JSON.stringify(formData)
  };

  console.log('options', options);
  console.log('formData', formData);

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    console.log('result', result);
    if (result.error) {
      return result.error;
    }
    return result.data;
  } catch (e) {
    return { error: e };
  }
}

function showConfigurationSidebar() {
  return HtmlService.createHtmlOutputFromFile('Sidebar');
  // const htmlOutput = HtmlService.createHtmlOutputFromFile('Sidebar')
  //   .setTitle('API Key Configuration');
  // CalendarApp.getUi().showSidebar(htmlOutput);
}
