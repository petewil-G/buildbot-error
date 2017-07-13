var errorCount = 0;
var failureCount = 0;
var warningCount = 0;

// One based index of the currently focused problem item
var errorIndex = 0;
var failureIndex = 0;
var warningIndex = 0;

function delayedParse() {
  // Don't start parsing unless we are done loading the logs
  var statusBar = document.getElementById('status-bar');
  var displayStyle = getComputedStyle(statusBar, null).display;
  // If we are still loading, check again in half a second.
  if (displayStyle != 'none') {
    window.setTimeout(delayedParse, 500);
    return;
  }
  // If the status bar has been hidden, it is safe to start parsing.
  doParse();
}

function doParse() {
  var nextError = 1;
  var nextWarning = 1;
  var nextFailure = 1;

  var statusLabel = document.getElementById('buildbotErrorStatusLabel');
  statusLabel.innerHTML = 'BuildbotError: Parsing errors and faiures...';

  // When using logdog, the errors are in individual divs under the "logs" div.
  var logs = document.getElementById('logs');
  var divs = logs.getElementsByClassName(
    'log-entry-chunk style-scope logdog-stream-view');
  // GCC errors look like this:
  // /.../dtoa/dtoa.c:2550: warning: comparison between signed and unsigned
  var kGCCErrorRE = new RegExp('^[^ :]+:\\d+: ', 'gm');
  var kPathRE = new RegExp('^/b/slave/(mac|linux|linux_view)/build/src/(.*)$', 'gm');
  var kPathWinRE = new RegExp('[a-zA-Z]:\\\\b\\\\slave\\\\([^\\\\]*)\\\\build\\\\src\\\\(.*)$', 'gm');
  var kMakeRE = new RegExp('^(make: \\*\\*\\* .* Error.*)', 'gm');
  for (var i = 0; i < divs.length; ++i) {
    var div = divs[i];
    if (div.innerHTML.match('error:') ||  // Mac style.
        div.innerHTML.match('error (C|LNK)[0-9][0-9][0-9][0-9]') ||  // Windows style.
        div.innerHTML.match(kGCCErrorRE) ||
        div.innerHTML.match('\[\ \ FAILED\ \ \]')) {
      // Clean up file paths pointing to the trybot file system.
      div.innerHTML = div.innerHTML.replace(kPathRE, '...<b>$2</b>');
      div.innerHTML = div.innerHTML.replace(kPathWinRE, '...<b>$2</b>');
      // Loop over the div adding an anchor for each error, failure, and
      // warning, and highlight the text.
      while (true) {
        // Don't use createElement/insertBefore because the error message could
        // be in the middle of a large div, and we want the anchor right where
        // the error is.
        var length = div.innerHTML.length;
        // We insert an anchor before the error message and if we don't exclude
        // errors/warnings with </a> in front this will loop forever, trying to
        // insert the anchor tag. Hence the [^>] at the front of the regexp.
        div.innerHTML = div.innerHTML.replace(
            /([^>])(error:|error (C|LNK)[0-9][0-9][0-9][0-9])/,
            '$1<a name=error' + nextError + '>' +
                '<b><font color=red>$2</font></b></a>');
        if (div.innerHTML.length != length) {
          ++nextError;
          continue;
        }

        // Check for warnings.
        div.innerHTML = div.innerHTML.replace(/[^>](warning:)/,
                                                '<a name=warning' + nextWarning + '>' +
                                                '<b><font color=red>$1</font></b></a>');
        if (div.innerHTML.length != length) {
          ++nextWarning;
          continue;
        }

        // Check for unit test failures.
        div.innerHTML = div.innerHTML.replace(
            /([^>])\[  FAILED  \]/,
            '$1<a name=failure' + nextFailure + '></a>' +
                '<b><font color=red>[  FAILED  ]</font></b>');
        if (div.innerHTML.length != length) {
          ++nextFailure;
          continue;
        }

        // If we get here, there's nothing left to replace.
        break;
      }
    }
    // Look for make system errors.
    if (div.innerHTML.match(kMakeRE)) {
      div.innerHTML = div.innerHTML.replace(kPathWinRE, '...<b>$2</b>');
      while (true) {
        var length = div.innerHTML.length;
        div.innerHTML = div.innerHTML.replace(kMakeRE,
                                                '<a name=error' + nextError + '>' +
                                                '<b><font color=red>$1</font></b></a>');
        if (div.innerHTML.length != length) {
          ++nextError;
          continue;
        }
        break;
      }
    }
  }
  // Set the global found counts for each type of problem.
  errorCount = nextError - 1;
  failureCount = nextFailure - 1;
  warningCount = nextWarning - 1;

  // Update the UI when parsing is complete
  var span = document.getElementById('buildbotErrorSpan');
  var statusLabel = document.getElementById('buildbotErrorStatusLabel');
  span.removeChild(statusLabel);
  statusLabel.innerHTML = '';

  // Once we have results, add buttons.
  span.appendChild(createButton('buildbotErrorPreviousFailureButton',
                                previousFailureButtonLabel(),
                                previousFailureClicked));
  span.appendChild(createButton('buildbotErrorNextFailureButton',
                                nextFailureButtonLabel(),
                                nextFailureClicked));
  span.appendChild(createButton('buildbotErrorPreviousErrorButton',
                                previousErrorButtonLabel(),
                                previousErrorClicked));
  span.appendChild(createButton('buildbotErrorNextErrorButton',
                                nextErrorButtonLabel(),
                                nextErrorClicked));
}

function nextErrorButtonLabel() {
  if (errorCount == 0)
    return 'no errors';
  else if (errorIndex == 0)
    return 'Next error (' + errorCount + ' found)';
  else
    return 'Next Error ' + errorIndex + '/' + errorCount;
}

function previousErrorButtonLabel() {
  if (errorCount == 0)
    return 'no errors';
  else if (errorIndex == 0)
    return 'Previous error (' + errorCount + ' found)';
  else
    return 'Previous Error ' + errorIndex + '/' + errorCount;
}

function nextFailureButtonLabel() {
  if (failureCount == 0)
    return 'no failures';
  else if (failureIndex == 0)
    return 'Next failure (' + failureCount + ' found)';
  else
    return 'Next Failure ' + failureIndex + '/' + failureCount;
}

function previousFailureButtonLabel() {
  if (failureCount == 0)
    return 'no failures';
  else if (failureIndex == 0)
    return 'Previous failure (' + failureCount + ' found)';
  else
    return 'Previous Failulre ' + failureIndex + '/' + failureCount;
}

function nextErrorClicked() {
  if (errorCount == 0)
    return;
  if (++errorIndex > errorCount)
    errorIndex = 1;
  document.location.hash = 'error' + errorIndex;
  document.getElementById('buildbotErrorNextErrorButton').value =
    nextErrorButtonLabel();
  document.getElementById('buildbotErrorPreviousErrorButton').value =
     previousErrorButtonLabel();
  window.scrollBy(0, -75);
}

function previousErrorClicked() {
  if (errorCount == 0)
    return;
  if (--errorIndex < 1)
    errorIndex = errorCount;

  document.location.hash = 'error' + errorIndex;
  document.getElementById('buildbotErrorNextErrorButton').value =
    nextErrorButtonLabel();
  document.getElementById('buildbotErrorPreviousErrorButton').value =
    previousErrorButtonLabel();
  window.scrollBy(0, -75);
}

function nextFailureClicked() {
  if (failureCount == 0)
    return;
  if (++failureIndex > failureCount)
    failureIndex = 1;
  document.location.hash = 'failure' + failureIndex;
  document.getElementById('buildbotErrorNextFailureButton').value =
    nextFailureButtonLabel();
  document.getElementById('buildbotErrorPreviousFailureButton').value =
    previousFailureButtonLabel();
  window.scrollBy(0, -75);
}


function previousFailureClicked() {
  if (failureCount == 0)
    return;
  if (--failureIndex < 1)
    failureIndex = failureCount;
  document.location.hash = 'failure' + failureIndex;
  document.getElementById('buildbotErrorNextFailureButton').value =
    nextFailureButtonLabel();
  document.getElementById('buildbotErrorPreviousFailureButton').value =
    previousFailureButtonLabel();
  window.scrollBy(0, -75);
}


function createButton(id, label, handler) {
  var button = document.createElement('input');
  button.id = id;
  button.type = 'submit';
  button.value = label;
  button.style.cssFloat = 'right';
  button.onclick = handler;
  return button;
}

function createStatusLabel() {
  var label = document.createElement('LABEL');
  label.innerHTML = 'BuildbotError: Waiting for logs to load...';
  label.id = 'buildbotErrorStatusLabel';
  label.style.cssFloat = 'right';
  return label;
}

// TODO: We need to wait until the logs are loaded before parsing.
// Currently we wait for a button press, can we catch an event intstead?
// div id status-bar hidden?  class "style-scope logdog-stream-view" hidden?
// doParse();
var span = document.createElement('span');
span.style.position = 'fixed';
span.style.right = 0;
span.style.top = 0;
span.id = 'buildbotErrorSpan';

// TODO: Don't show the buttons until parsing is done.  Instead, label saying
// "waiting for logs to load", or "parsing errors"
var statusLabel = createStatusLabel();
span.appendChild(statusLabel);

document.body.appendChild(span);


// Ideas to wait for logs
// 1. See if the model object is a global, I can add an event listener for
//    the stream status callback.
// 2. Look at the streamView, get the statusBar from it. If the status bar is
//    gone, we are set.  If not, we can maybe loop until it is, or set an event
//    watching for it.
// 3. See if we get a polymer "changed" event for the statusBar.
delayedParse();
