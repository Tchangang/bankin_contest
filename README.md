# Bankin contest
Script by Tchangang Boris-Emmanuel [Linkedin](https://www.linkedin.com/in/boris-emmanuel-tchangang-90886a83)
**Goal : Scrap this page [Bankin super page](https://web.bankin.com/challenge/index.html)**

## Install
Clone the repo and run npm install in the downloaded folder.

## Technology and used Libraries
This code uses Chrome headless packaged in a special npm module called (Phantomimi (one of my package)).<br/>
Chrome is driven with chrome remote interface protocol lib modified.<br/>
Phantomimi use the beta channel of Chrome modified to be stable.

## Test
Test was done on Mac os, with Chrome Canary 56. Instructions to download Chrome Canary here : [Download Canary](https://www.google.fr/chrome/browser/canary.html)

## Code Architecture
The code is divided in many functions. 

### Functions

Function | Description
------------ | -------------
Content from cell 1 | Content from cell 2
Content in the first column | Content in the second column 

### Variable
Phantomimi was build to work with Aws lambda. However you can use local version of chrome headless (canary) by setting the variable CHROME_PATH (index.js, line 2).
To 

## Important



