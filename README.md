# Bankin contest
Script by Tchangang Boris-Emmanuel [Linkedin](https://www.linkedin.com/in/boris-emmanuel-tchangang-90886a83)<br>
**Goal : Scrap this page [Bankin super page](https://web.bankin.com/challenge/index.html)**

## Install
Clone the repo and run **npm install** in the folder.

## Technology and used Libraries
This code uses Chrome headless packaged in a special npm module called (Phantomimi (one of my package)).<br/>
Chrome is driven with chrome remote interface protocol lib modified.<br/>
Phantomimi uses the beta channel of Chrome modified to be stable.<br/>

The code also required babel-polyfill for phantomimi's compatibility.

## Test
Tests were done on Mac os, with Chrome Canary 56. Instructions to download Chrome Canary here : [Download Canary](https://www.google.fr/chrome/browser/canary.html)

## Code Architecture
The code is splitted into functions and needs variables to be set. 

### Functions

Function | Description
------------ | -------------
getTransactionsFromPage | Get the transactions from the page depending of the configuration (iframe, reload button, etc...)
scrapPage | Open next page and call getTransactionsFromPage()
getUrl | Build the right url (with the right params)
main | Launch the main function

### Result
Transactions are stored in a variable named transactionsFound (index.js, line 291).
The script also saves transactions in json file and displays statistics such as execution time.

### Variable
##### CHROME_PATH
Phantomimi was build to work with AWS lambda. However you can use a local version of chrome headless (canary) by setting the variable CHROME_PATH (index.js, line 2). Default value: */Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary*<br>


##### PARALLEL_INSTANCE
Be fast as possible needs parallel scrapping. To set the number of chrome instance that will be launched, set the variable PARALLEL_INSTANCE (index.js, line 3). Default : 5<br/>


## Important
Please verify that the path of your local Chrome is the right path. Phantomimi needs CHROME_PATH to work. <br/>
Launching various chrome instances could be difficult on your machine depending of it's configuration. Moreover there is a delay before the launch command and the chrome's startup.<br>
This script can be faster on AWS lambda by launching more instances at the same time (Ex : 10 chrome instances) without any lag as working with local Chrome instance.

