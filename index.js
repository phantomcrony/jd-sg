const Discord = require('discord.js');
const request = require('request');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const JDLaunch = require('./schema/JDLaunch');
const {comparer} = require('./comparer/utils');

const client = new Discord.Client();

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    //Set Bot Presence in Discord
    client.user.setPresence({
        status: "online",
        activity: {
            // The message shown
            name: `${process.env.BOT_STATUS}`,
            // PLAYING, WATCHING, LISTENING, STREAMING
            type: "WATCHING"
        }
    });
    //Connecting to mongo db
    mongoose.connect(`${process.env.MONGODB_URI}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    }).then(
        () => {
            //Tell Database is Connected
            console.log('Database is connected')
            //Set interval of scraping
            setInterval(ScrapJDLaunch, `${process.env.SCRAP_INTERVAL}`);
        }, //If cannot connect to database
        err => {
            //Tell Database is no connected 
            console.log('Can not connect to the database' + err)
        }
    );
});

//Scrap
function ScrapJDLaunch() {

    //Set request options
    let options = {
        //Site url
        url: `${process.env.SCRAPE_LINK_NEW}`,
        //Cookies
        jar:true,
        //Http Headers
        headers: {
            "user-agent": `${process.env.USER_AGENT_NEW}`,
            "authority": `${process.env.AUTHORITY_LINK_NEW}`,
            "referer": `${process.env.REFERER_LINK_NEW}`,
            "path": `${process.env.PATH_LINK_NEW}`,
            "method": `${process.env.METHOD_HEADER}`,
            "accept": `${process.env.ACCEPT_HEADER}`,
            "scheme": `${process.env.SCHEME_HEADER}`
        },
        //Timeout to contact the website
        timeout: `${process.env.TIMEOUT_TIME}`
    };

    //Start Request
    request(options, async (error, response, html) => {

        //Set Flag value to check same data insertion
        let flag=false

        //If not error contacting website
        if (!error && response.statusCode == 200) {

            let $ = cheerio.load(html);
            let productNames = [];
            let links = [];
            let pictures = [];

            //Store Product Data
            let products = [];

            //Scrape title
            $('.itemTitle').find('a').each((i, el) => {
                productNames[i] = $(el).text().toUpperCase();
            });

            //Scrape link
            $('.itemTitle').find('a').each((i, el) => {
                links[i] = "https://www.jdsports.sg" + $(el).attr('href');
            });

            //Scrape picture
            $('span.thumbnail.overlay-thumbnail').find('source').each((i, el) => {
                pictures[i] = $(el).attr('data-srcset').split(',').pop().replace(/\s/g, '');
            });

            //Store all products data in an array
            for (let i = 0; i < productNames.length; i++) {
                products.push({
                    'product_name': productNames[i],
                    'link': links[i],
                    'picture': pictures[i]
                });
            }

            //Take data fron mango DB to compare
            let data = []

            //Fetching all the previous data from mongoDB
            try {
                data = await JDLaunch.find({}, '-_id -__v');
            }
            //If error fetching data from mongodb
            catch (err) {
                console.log("Unable to query the database", err)
            }

            let JDLaunchData = {products:data}

            //Compare data in website and db
            let JDLaunchProducts = comparer(products, JDLaunchData.products);

            //If no new product detected
            if (JDLaunchProducts.length < 1 || JDLaunchProducts.length == 0 ) {
            } 
            else {
                //If new product detected
                if (JDLaunchProducts.length > 0) {
                    for (let i = 0; i < JDLaunchProducts.length; i++) {
                        //Add element
                        const element = JDLaunchProducts[i];
                        //Add datas into embed fields
                        const productEmbed = new Discord.MessageEmbed()
                            //Set Message Author
                            .setAuthor(`${process.env.SITE_NAME} (${process.env.CATEGORY_NAME_NEW})`, `${process.env.BRANDING_LOGO}`, `${process.env.SCRAPE_LINK_NEW}`)
                            //Set message color
                            .setColor(`${process.env.COLOR}`)
                            //Set message title
                            .setTitle((`${JDLaunchProducts[i].product_name}`).toUpperCase())
                            //Set message url
                            .setURL(`${JDLaunchProducts[i].link}`)
                            //Set Fields
                            .addFields(
                                { 
                                    name: 'Site:', 
                                    value: `${process.env.SITE_NAME}`, 
                                    inline:true 
                                },
                                { 
                                    name: 'Category:', 
                                    value: `${process.env.CATEGORY_NAME_NEW}`, 
                                    inline:true 
                                },
                                { 
                                    name: 'Region:', 
                                    value: `${process.env.REGION_SHOP}`, 
                                    inline:true 
                                },
                                { 
                                    name: 'Other Links:', 
                                    value: "[Cart]"+"(" + `${process.env.CART_LINK}` + ")" + " | " + "[StockX]" + "(https://stockx.com/)" + " | " + "[eBay]" + "(https://www.ebay.com/)" + " | " + "[Goat]" + "(https://www.goat.com/)" 
                                }
                            )
                            //Set timestamp
                            .setTimestamp()
                            //Set thumbnails
                            .setThumbnail(`${JDLaunchProducts[i].picture}`)
                            //Set footer
                            .setFooter(`${process.env.BRANDING_WORDS}`, `${process.env.BRANDING_LOGO}`);
                            
                        //Check if same unique data exist
                        let d = await JDLaunch.find({link: element.link});

                        //Check Link
                        if (d && d.length==0){
                            if (client.channels.cache.get(`${process.env.DISCORD_CHANNEL_ID_NEW}`)){
                                //Try to insert data into MongoDB and send to discord
                                try{
                                    //Insert Data into MongoDB
                                    await JDLaunch.insertMany([element]);
                                    //Post Message to channel
                                    client.channels.cache.get(`${process.env.DISCORD_CHANNEL_ID_NEW}`).send(productEmbed);
                                    //Set Flag to true
                                    flag=true;
                                }
                                //Catch Errors inserting data
                                catch(e){
                                }
                            }
                        }
                    }
                    //Print Result
                    if (flag){
                        console.log(`${process.env.SITE_NAME} (${process.env.CATEGORY_NAME_NEW}) Database Updated!`);
                    }
                    else{
                    }
                }
            }
        }
        else{
            console.log(`Cannot connect to the website , Retrying! ${process.env.SITE_NAME} (${process.env.CATEGORY_NAME_NEW})`);
        }      
    });
}
//Discord Bot Token
client.login(`${process.env.DISCORDJS_BOT_TOKEN}`);
