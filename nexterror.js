var errorcount = 0;
var failurecount = 0;

function doParse() {
  var next_error = 1;
  var next_warning = 1;
  // When using logdog, the errors are in individual divs under the "logs" div.
  var logs = document.getElementById('logs');
  var divs = logs.getElementsByTagName('div');
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
        div.innerHTML.match('^\[  FAILED  \]')) {
      div.innerHTML = div.innerHTML.replace(kPathRE, '...<b>$2</b>');
      div.innerHTML = div.innerHTML.replace(kPathWinRE, '...<b>$2</b>');
      while (true) {
        // Don't use createElement/insertBefore because the error message could be in
        // in the middle of a large div, and we want the anchor right here.
        var length = div.innerHTML.length;
        // We insert an anchor before the error message and if we don't exclude
        // errors/warnings with </a> in front this will loop forever, trying to
        // insert the anchor tag. Hence the [^>] at the front of the regexp.
        div.innerHTML = div.innerHTML.replace(/[^>](error:|error (C|LNK)[0-9][0-9][0-9][0-9])/,
                                                '<a name=error' + next_error + '></a>' +
                                              '<b><font color=red>$1</font></b>');
        div.innerHTML = div.innerHTML.replace(/[^>]\[  FAILED  \]/,
                                                '<a name=error' + next_error + '></a>' +
                                                '<b><font color=red>DERP^[  FAILED  ]DERP</font></b>');
        if (div.innerHTML.length != length) {
          ++next_error;
          // TODO: solve the recursion problem for test failures.
          continue;
        }

        div.innerHTML = div.innerHTML.replace(/[^>](warning:)/,
                                                '<a name=warning' + next_warning + '></a>' +
                                                '<font color=red>$1</font>');
        if (div.innerHTML.length != length) {
          ++next_warning;
          continue;
        }

        // If we get here, there's nothing left to replace.
        break;
      }
    }
    if (div.innerHTML.match(kMakeRE)) {
      div.innerHTML = div.innerHTML.replace(kPathWinRE, '...<b>$2</b>');
      while (true) {
        var length = div.innerHTML.length;
        div.innerHTML = div.innerHTML.replace(kMakeRE,
                                                '<a name=error' + next_error + '></a>' +
                                                '<font color=red>$1</font>');
        if (div.innerHTML.length != length) {
          ++next_error;
          continue;
        }
        break;
      }
    }
  }
  errorcount = next_error - 1;
}

function doParseFailures() {
  var next_failure = 1;
  // When using logdog, the errors are in individual divs under the "logs" div.
  var logs = document.getElementById('logs');
  var divs = logs.getElementsByTagName('div');;
  for (var i = 0; i < divs.length; ++i) {
    var div = divs[i];
    if (div.innerHTML.match('^\[  FAILED  \]')) {
      while (true) {
        // Don't use createElement/insertBefore because the error message could be in
        // in the middle of a large div, and we want the anchor right here.
        var length = div.innerHTML.length;
        // We insert an anchor before the error message and if we don't exclude
        // errors/warnings with </a> in front this will loop forever, trying to
        // insert the anchor tag. Hence the [^>] at the front of the regexp.
        div.innerHTML = div.innerHTML.replace(/[^>]\[  FAILED  \]/,
                                                '<a name=failure' + next_failure + '></a>' +
                                                '<b><font color=red>DERP^[  FAILED  ]DERP</font></b>');
        if (div.innerHTML.length != length) {
          ++next_failure;
          // TODO: solve the recursion problem for test failures, then back to continue.
          break;
          // continue;
        }

        // If we get here, there's nothing left to replace.
        break;
      }
    }
  }

  failurecount = next_failure - 1;
}

// TODO: Maybe change name to currentErrorIndex() (and others as well)
// Returns the one-based index of current error.
function currentIndex() {
  var hash = document.location.hash;
  if (!hash)
    return 0;
  else
    return parseInt(hash.substr('#error'.length));
}

// Returns the one-based index of current faliure.
function currentFailureIndex() {
  var hash = document.location.hash;
  if (!hash)
    return 0;
  else
    return parseInt(hash.substr('#failure'.length));
}

function buttonLabel(index) {
  if (errorcount == 0)
    return 'Find Errors';
  else if (index == 0)
    return 'Next error (' + errorcount + ' found)';
  else
    return 'Error ' + index + '/' + errorcount;
}

function failureButtonLabel(index) {
  if (failurecount == 0)
    return 'Find Failures';
  else if (index == 0)
    return 'Next failure (' + failurecount + ' found)';
  else
    return 'Failure ' + index + '/' + failurecount;
}

function nextError() {
  if (errorcount == 0)
    doParse();
  var index = currentIndex();
  if (++index > errorcount || isNaN(index))
    index = 1;
  document.location.hash = 'error' + index;
  document.getElementById('nextErrorButton').value = buttonLabel(index);
}

function nextFailure() {
  if (failurecount == 0)
    doParseFailures();
  var index = currentFailureIndex();
  if (++index > failurecount || isNaN(index))
    index = 1;
  document.location.hash = 'failure' + index;
  document.getElementById('nextFailureButton').value = failureButtonLabel(index);
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

// TODO: We need to wait until the logs are loaded before parsing.
// Currently we wait for a button press, can we catch an event intstead?
// doParse();

var span = document.createElement('span');
span.style.position = 'fixed';
span.style.right = 0;
span.style.top = 0;

span.appendChild(createButton('nextFailureButton',
                              failureButtonLabel(currentFailureIndex()),
                              nextFailure));
span.appendChild(createButton('nextErrorButton',
                              buttonLabel(currentIndex()),
                              nextError));

document.body.appendChild(span);

