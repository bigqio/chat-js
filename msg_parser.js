//
// message parser test
//

var fs = require('fs');

fs.readFile('sample_msg.txt', 'utf8', function (err,data) {
  if (err) {
  	console.log('Error: ' + err);
    return;
  }

  console.log('Successfully read sample_msg.txt:');
  console.log('');
  console.log(data);  

  var data_found = false;
  var newline = '\r\n';
  var curr_data = data;
  var ret = { };

  while (!data_found) {
    var newline_pos = curr_data.indexOf(newline);
    if (newline_pos == 0) {
      //
      // end of headers
      //
      console.log('End of headers reached');
   	  headers_done = true;
      curr_data = curr_data.substring(2, curr_data.length);
      ret['data'] = curr_data;
      data_found = true;
    }
    else {
      //
      // read until newline
      //
      var curr_line = curr_data.substring(0, newline_pos);
      console.log('Processing line: ' + curr_line);
      curr_data = curr_data.substring(newline_pos + 2, curr_data.length);

      var header = curr_line.split(':');
      if (header.length != 2) {
      	console.log('Apparently this is not a proper header line: ' + curr_line);
      	continue;
      }
      
      var key = header[0].trim();
      var val = header[1].trim();
      ret[key] = val;
    }
  }

  console.log('');
  console.log('Parsed data:');
  console.log('');
  console.log(ret);
  console.log('');
});
