Copy the script to your frontend, run node index.js.
Translation files now should be splitted route based.

Note: If a key is both conflicted (exists in multiple translation files) and unused (not called by any t()) it is not handled anywhere in the pipeline. It can be manually removed.
