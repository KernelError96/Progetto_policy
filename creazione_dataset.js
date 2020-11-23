/*
Organizzazione dataset1:
Sito primario, csp, x-frame-option


Organizzazione dataset2:
Sito primario, sito iframe, csp, x-frame-option
*/

const puppeteer = require('puppeteer');
const stringify = require('json-stringify-safe')

const fs = require('fs')

var dataset1 = require('fs')
var dataset2 = require('fs')


const fileContents = fs.readFileSync('./topm.csv').toString()


readline = require('readline')

/*
Lettura file csv: estrapolo da ogni riga del file csv il nome del sito interessato.
Per ciascun sito chiamo la funzione check_page ( per esaminare ciascuna pagina )
 e attendo la sua risposta.
*/
async function readCSV(){
  const fileStream = fs.createReadStream('./topm.csv');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });


  for await (const line of rl) {
    var currentline=line.split(",");
    
    var risposta_server_http = await check_page("http://www."+currentline[1]) 
  }

}



// funzione che cerca gli iframe e per ciascuno stampa le policy
async function check_page(web_page){

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    var current_xfo = null;
    var current_csp = null;
    
    /*
    Se ottengo una risposta dalla pagina corrente entro 60 secondi entro nel blocco try,
    Altrimenti restituisco un errore
    */
    try{
      var response = await page.goto(web_page,{
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      /* Estrapolo la csp e l'xfo dalla risposta http e successivamente le salvo nel file
      dataset1.txt */
      var csp = null;
      var xfo = null;
      console.log("Status code:", response.status());
      var res_string = stringify(response);
      current_xfo = res_string.match("x-frame-options\":\"([^\"]*)")
      current_csp = res_string.match("content-security-policy\":\"([^\"]*)")
      if(current_xfo){
      
        xfo = current_xfo[1]
      }
      if(current_csp){
        
        csp = current_csp[1]
      }
      
      dataset1.appendFile('dataset1.txt',page.mainFrame().url()+","+csp+","+xfo+"\n\n", function(err){
              if(err) throw err;
              //console.log("Ho messo in dataset1: "+page.mainFrame().url()+","+csp+","+xfo)
      });

      
      /*
      Per ogni iframe interno alla pagina corrente invio una richiesta http, dalla risposta ricaverò
      la csp e l'xfo relativi ad essa
      */
      console.log("La pagina: "+page.mainFrame().url()+" ha: "+page.mainFrame().childFrames().length+" iframe")
      for (const frame of page.mainFrame().childFrames()){
        var pattern = /^((http|https):\/\/)/;
        
        if(!pattern.test(frame.url().toString())){
          //console.log("blank, sarebbe: "+frame.url())
        }
        else{

          /* Su ogni iframe che trovo all'interno della pagina invio una richieta http, dalla
           risposta ricavo la csp e l'xfo e li salvo nel dataset */
          
          var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;       
          var req = new XMLHttpRequest();
          
          req.open('GET', frame.url(), false);
          req.send(null)
          var headers = req.getAllResponseHeaders().toLowerCase();       
          var arr = headers.trim().split(/[\r\n]+/);
              // Create a map of header names to values
              var headerMap = {};
              arr.forEach(function (line) {
                var parts = line.split(': ');
                var header = parts.shift();
                var value = parts.join(': ');
                headerMap[header] = value;
              });
          dataset2.appendFile('dataset2.txt',page.mainFrame().url()+","+frame.url()+","+headerMap["content-security-policy"]+","+headerMap["x-frame-options"]+"\n\n", function(err){
              if(err) throw err;
              //console.log("ho salvato nel dataset: "+page.url()+","+headerMap["content-security-policy"]+","+headerMap["x-frame-options"]+"\n\n")
          });

        }    
      } 
  
    
    
    }catch(error){
      console.log("errore per la pagina: "+page.mainFrame().url()+" "+error.message)
    }

    await browser.close();
 
}

 readCSV() 
