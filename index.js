let transactions = [] // final transactions array
let CHROME_PATH = '/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary' // PATH OF CHROME HEADLESS
const PARALLEL_INSTANCE = 5

let chromeHelper = require("phantomimi") // phantomimi is a personal lib for scrapping with Chrome Headless (handle proxy management and others great features)

const PAGE = 'https://web.bankin.com/challenge/index.html' //Structure of url to be scrapped.
const RANGE_SCRAPPING = 50 //Number of result per page

/* Set of usefull selector (to retrieve transactions) */
const PAGE_SELECTOR = {
  generateButtonSelector:'#btnGenerate',
  transactionElementSelector:'#dvTable table tr',
  iframeSelector:'iframe',
  nextLinkSelector:'a'
}

/*
  @getTransactionsFromPage : Function to get transactions on the page. Transactions can be directly on the page or in an iframe. 
  This function wait for iframe or transactions array to be loaded and then retrieve the result by injecting an expression (js function)
*/
const getTransactionsFromPage = async (myChrome)=>{
  let iframeOrTransactionLoaded = await myChrome.waitForOneElement([PAGE_SELECTOR.transactionElementSelector,PAGE_SELECTOR.iframeSelector],50000) // Check if we have transactions on page or iframe
  let transactions // Array of transactions on the page. Empty at begining
  if(iframeOrTransactionLoaded && iframeOrTransactionLoaded.statut){
    // console.log('One element was loaded') // Use for debug purpose
    const isDataInIframe = await myChrome.exists(PAGE_SELECTOR.iframeSelector) // Check if iframe exists
    if(isDataInIframe && isDataInIframe.statut){
      // Iframe was detected, we will inject a script. This script get infos from iframe with contents() function and return the list of transactions.
      // The currency is the last character of the price. 
      // This expression returns a 'stringified' JSON object that will be parsed later.
      const expression = 
      `
        new Promise((resolve,reject)=>{
          var transactionsArray = []
          var transactions = jQuery('iframe').contents().find('table tr');
          for(var i=0;i<transactions.length;i++){
            if($(transactions[i]).find('td:last-child').html() && $(transactions[i]).find('td:last-child').html().length>0){
              var transaction = {
                Account:$(transactions[i]).find('td:eq(0)').html(),
                Transaction:$(transactions[i]).find('td:eq(1)').html(),
                Amount:$(transactions[i]).find('td:eq(2)').html(),
                Currency:$(transactions[i]).find('td:eq(2)').html().trim().substr(-1),
              }
              if(transaction && transaction.Transaction){
                var temp = transaction.Transaction.split(' ')
                if(temp && temp.length==2)
                  transaction.TransactionId = temp[1]
              }
              if(transaction.Amount && transaction.Amount.length>0){
                transaction.Amount = transaction.Amount.replace(new RegExp('€','g'),'')
                if(transaction.Amount)
                  transaction.Amount = parseInt(transaction.Amount)
              }
              transactionsArray.push(transaction)
            }
          }
          resolve(JSON.stringify(transactionsArray))
        })
      `
      // Evaluate our expression (custom function) in the page
      transactions = await myChrome.chrome.Runtime.evaluate({
        awaitPromise:true,
        expression:expression
      })
      return JSON.parse(transactions.result.value) // return transactions found on the page
    }else{
      // We detect transaction on the page.
      // The currency is the last character of the price. 
      // This expression returns a 'stringified' JSON object that will be parsed later.
      const expression = 
      `
        new Promise((resolve,reject)=>{
          var transactionsArray = []
          var transactions = jQuery('${PAGE_SELECTOR.transactionElementSelector}');
          for(var i=0;i<transactions.length;i++){
            if($(transactions[i]).find('td:last-child').html() && $(transactions[i]).find('td:last-child').html().length>0){
              var transaction = {
                Account:$(transactions[i]).find('td:eq(0)').html(),
                Transaction:$(transactions[i]).find('td:eq(1)').html(),
                Amount:$(transactions[i]).find('td:eq(2)').html(),
                Currency:$(transactions[i]).find('td:eq(2)').html().trim().substr(-1),
              }
              if(transaction && transaction.Transaction){
                var temp = transaction.Transaction.split(' ')
                if(temp && temp.length==2)
                  transaction.TransactionId = temp[1]
              }
              if(transaction.Amount && transaction.Amount.length>0){
                transaction.Amount = transaction.Amount.replace(new RegExp('€','g'),'')
                if(transaction.Amount)
                  transaction.Amount = parseInt(transaction.Amount)
              }
              transactionsArray.push(transaction)
            }
          }
          resolve(JSON.stringify(transactionsArray))
        })
      `
      // Evaluate our expression (custom function) in the page
      transactions = await myChrome.chrome.Runtime.evaluate({
        awaitPromise:true,
        expression:expression
      })
      return JSON.parse(transactions.result.value)
    }
  }else{
    // if we detect no data after 50s, stop the function. I choose 50s, because it's really long to load data.
    return null
  }
}

/*
  @scrapPage : Function that will extract transactions with @getTransactionsFromPage and will load next page until no more data. 
*/
const scrapPage = async (myChrome,idx,transactions,stop,continueUntilNoMoreData)=>{
  return new Promise(async (resolve, reject) => {
    let result // Variable to store transactions
    // Check for transactions directly on the page (Yeeeeeeees it's possible sometimes :-))
    const isTransactionPresent = await myChrome.exists(PAGE_SELECTOR.transactionElementSelector)
    
    // Check for button to reload data.
    const isBtnGeneratePresent = await myChrome.exists(PAGE_SELECTOR.generateButtonSelector)

    if(isTransactionPresent && isTransactionPresent.statut){
      // If transactions are on the page, just extract them.
      result = await getTransactionsFromPage(myChrome)
    }else if(isBtnGeneratePresent && isBtnGeneratePresent.statut){
      // If we found reload button on the page, we need to click it and then extract informations when available.
      await myChrome.click(PAGE_SELECTOR.generateButtonSelector)
      result = await getTransactionsFromPage(myChrome)
    }else{
      // If we didn't find transactions on the page and no 'reload button', just wait and extract transactions when available.
      result = await getTransactionsFromPage(myChrome)      
    }
    // If we got transactions from page
    if(result && result.length){
      transactions = transactions.concat(result) // Merge transactions and result.
      /* If we found a transactions, we can load the next page */
      if(result && result.length>0){
        if((idx+RANGE_SCRAPPING)<stop || continueUntilNoMoreData){
          await myChrome.open(getUrl(idx+RANGE_SCRAPPING)) // opening next page
          // console.log('transactions',transactions.length) // debug purpose
          scrapPage(myChrome,idx+RANGE_SCRAPPING,transactions,stop,continueUntilNoMoreData)
          .then((result)=>{
            resolve(result)
          })
          .catch((e)=>{
            resolve(result)
          })
        }else{
          resolve(transactions)
        }
      }
    }else{
    // If there are no more transactions, return all previous transactions.
      resolve(transactions)
    }
  })
}

/*  
  @getUrl : Function to create url to be scrapped. 
*/
const getUrl = (index)=>{
  return PAGE+(index>0?'?start='+index:'')
}

/*****************************************************************************************/
// End of function declaration
/*****************************************************************************************/

/*****************************************************************************************/
/*****************************************************************************************/ 
// Begin program
/*****************************************************************************************/
/*****************************************************************************************/
const main = async ()=>{
  return new Promise(async (resolve, reject) => {
    // Number of chrome instance to launch. Please pay attention. Don't try on your local machine with a value > 10. 
    // This is usefull when using Phantomimi with aws lambda <3.
    const TOP_START = new Date().getTime()
    // Assumption about data length. You can change it and set to 300 by example, it will get all the data (up to 4999 in this case).
    const MAX_DATA = 5000
    const INTERVAL = Math.ceil(MAX_DATA/PARALLEL_INSTANCE)
    let dataArray = [] // store data length scrapped
    let timeArray = [] // store time execution and get the biggest
    var allTransactions = []
    /* Chrome configuration for chrome headless*/
    for(var i=0;i<PARALLEL_INSTANCE;i++){
      let continueUntilNoMoreData = false
      if(i==PARALLEL_INSTANCE-1){
        // We will assume that our dataset is about 5000 transactions with 50 transactions per line
        // If we have more than 4999 transactions, we will not get all transactions, that's why this function will continue until there are no more data
        continueUntilNoMoreData = true
      }
      const chromeConfig = {
        userAgent:"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36",
        debugRequest:true,
        port:(9222+i),
        CHROME_PATH:CHROME_PATH,
        viewPort:{width:1920,height:1080}
      }
      let myChrome // Variable for chrome instance

      myChrome = new chromeHelper(chromeConfig) // Launch Chrome instance

      let result = await myChrome.launch() // Wait Chrome to be launched

      // If Chrome is not launched, stop everything
      if(!result.statut){
        console.log('Can\t launch chrome. An error occured.\n\n---------------------------------\nIf you work on local, please set the CHROME_PATH variable before. (above)\n---------------------------------')
      }else{
        //If Chrome is launched, we can continue

        // Handle dialog opening to close it directly
        myChrome.chrome.Page.javascriptDialogOpening((dialog)=>{
          // Close dialog
          myChrome.chrome.Page.handleJavaScriptDialog({accept:true})
        })

        // Handle dialog closed
        myChrome.chrome.Page.javascriptDialogClosed((dialog)=>{
          // console.log('Closing modal') // line for debug purpose only
        })

        // Open first url (index 0)
        await myChrome.open(getUrl(Math.ceil((i*INTERVAL))))
        // transactionsList represent all transactions on the page.
        const begin = Math.ceil((i*INTERVAL)/RANGE_SCRAPPING)*RANGE_SCRAPPING
        const end = Math.ceil(((i+1)*INTERVAL)/RANGE_SCRAPPING)*RANGE_SCRAPPING
        const fileName = `transactions_${begin}_to_${end}.json`
        scrapPage(myChrome,begin,[],end,continueUntilNoMoreData) 
        .then((transactionsList)=>{
          // Close chrome headless instance
          myChrome.close()
          if(transactionsList)
            allTransactions = allTransactions.concat(transactionsList)
          // Save transactionsList to file
          dataArray.push(transactionsList.length)
          timeArray.push(new Date().getTime() - TOP_START)
          // ----------------------------------
          // Display informations and statistics
          // ----------------------------------
          const fs = require('fs')
          fs.writeFile(fileName, JSON.stringify(transactionsList), 'utf8', ()=>{
            console.log('Scrap is over. Enjoy result.')
            console.log('--------------------------')
            console.log('Phantomimi is a library that works well with aws lambda. With aws lambda you can scrap with multiple instance at same time (parallel scrapping).')
            console.log('With aws lambda, these transactions could be scrapped in 20 seconds only.')
            console.log('Phantomimi use the beta Chrome version with a chrome remote interface lib customized.')
            console.log('--------------------------')
            console.log('BenchMark')
            console.log('Computer : Core i5 2.6 GHz, RAM 8 Go 1600 MHz, ping : 26ms, Download: 6.16 Mbps, Upload: 0.86 Mbps (http://www.speedtest.net/result/6997039789)')
            console.log('Chrome instance launched | Execution time')
            console.log('          1              | 179 267 ms')
            console.log('          2              | 83 869 ms')
            console.log('          3              | 109 694 ms')
            console.log('          4              | 76 779 ms')
            console.log('          5              | 62 089 ms')
            console.log('          6              | 65 853 ms')
            console.log('          7              | 64 289 ms')
            console.log('          8              | 63 696 ms')
            console.log('--------------------------')
            console.log('Result could be different for different computers.')
          });
          if(timeArray.length==PARALLEL_INSTANCE){
            const sizeScrapped = dataArray.reduce((accumulateur, valeurCourante) => accumulateur + valeurCourante)
            console.log(`${sizeScrapped} scrapped in ${Math.max(...timeArray)} ms ~ ${Math.floor(Math.max(...timeArray)/1000)}`)
            // Here we have all transactions
            console.log('Final transactions array is : ',allTransactions)
            // Do SOMETHING HERE
            resolve(allTransactions)
          }
        })
        .catch((e)=>{
          console.log(e)
          resolve(allTransactions)
        })
      }
    }
  })
}

// Launch hostilities
main()
.then((transactionsFound)=>{
  // ********************************
  // RESULT OF SCRAPPING HERE
  // ********************************
  console.log('Transactions array ',transactionsFound)
  // ********************************
})
.catch((e)=>{
  // ********************************
  console.error('An error occured')
  console.error(e)
  // ********************************
})