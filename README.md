This script splits your `translation.json` file into multiple files like `common.json` `user-profile.json` `settings.json` etc. (This is determined by folder structure under `/pages` folder.)  
Copy the script to your frontend project, run `node index.js`.

Notes:
* If a key is both conflicted (exists in multiple translation files) and unused (not called by any t()) it is not handled anywhere in the pipeline. It can be manually removed.
(Feel free to open open up PR)
* All the files under src are mock files that you can test this script on. You only need the run the index.js file at the root.
* Some edge cases may not be handled, regex might -not- match all possible t() calls under the sun such as t called with parameter a nested function parameter etc.


