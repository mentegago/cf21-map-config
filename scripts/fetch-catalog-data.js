const fs = require('fs');

async function fetchHTML(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }
        
        const htmlContent = await response.text();
        return htmlContent;
        
    } catch (error) {
        throw new Error(`Failed to fetch HTML: ${error.message}`);
    }
}

function extractInitialState(htmlContent) {
    try {
        const initialStateRegex = /window\.__INITIAL_STATE__\s*=\s*({.*?});/s;
        const match = htmlContent.match(initialStateRegex);
        
        if (match && match[1]) {
            console.log('Found window.__INITIAL_STATE__ data');
            return JSON.parse(match[1]);
        }
        
        const alternativePatterns = [
            /window\.__INITIAL_STATE__\s*=\s*(\[.*?\]);/s,
            /__INITIAL_STATE__\s*=\s*({.*?});/s,
            /window\.__NUXT__\s*=\s*({.*?});/s,
            /window\.__VUE_SSR_CONTEXT__\s*=\s*({.*?});/s
        ];
        
        for (const pattern of alternativePatterns) {
            const altMatch = htmlContent.match(pattern);
            if (altMatch && altMatch[1]) {
                console.log(`Found alternative data pattern: ${pattern.source}`);
                return JSON.parse(altMatch[1]);
            }
        }
        
        console.log('No initial state data found in HTML');
        return null;
        
    } catch (error) {
        console.error('Error parsing initial state data:', error.message);
        return null;
    }
}

function saveHTMLToFile(htmlContent, filename = 'tmp/fetched-catalog.html') {
    try {
        if (!fs.existsSync('tmp')) {
            fs.mkdirSync('tmp');
        }
        fs.writeFileSync(filename, htmlContent, 'utf8');
        console.log(`HTML content saved to ${filename}`);
    } catch (error) {
        console.error('Error saving HTML file:', error.message);
    }
}

function searchForJSONData(htmlContent) {
    console.log('\nSearching for any JSON-like data in HTML...');
    
    const scriptRegex = /<script[^>]*>([^<]*)<\/script>/gi;
    let scriptMatch;
    let scriptCount = 0;
    
    while ((scriptMatch = scriptRegex.exec(htmlContent)) !== null) {
        scriptCount++;
        const scriptContent = scriptMatch[1].trim();
        
        if (scriptContent.length > 50) {
            console.log(`\nScript ${scriptCount} (${scriptContent.length} chars):`);
            console.log(scriptContent.substring(0, 200) + '...');
            
            const jsonLikeRegex = /(\{[^{}]*"[^"]*"[^{}]*\})/g;
            let jsonMatch;
            while ((jsonMatch = jsonLikeRegex.exec(scriptContent)) !== null) {
                try {
                    const parsed = JSON.parse(jsonMatch[1]);
                    console.log('Found JSON data:', JSON.stringify(parsed, null, 2));
                } catch (e) {
                }
            }
        }
    }
    
    console.log(`\nTotal script tags found: ${scriptCount}`);
}

async function main() {
    const url = 'https://catalog.comifuro.net/catalog';
    
    try {
        console.log(`Fetching HTML content from ${url}...`);
        const htmlContent = await fetchHTML(url);
        
        console.log(`Successfully fetched ${htmlContent.length} characters of HTML content`);
        
        saveHTMLToFile(htmlContent);
        
        console.log('\nExtracting window.__INITIAL_STATE__ data...');
        const initialStateData = extractInitialState(htmlContent);
        
        if (initialStateData) {
            console.log('\n=== WINDOW.__INITIAL_STATE__ DATA ===');
            console.log(JSON.stringify(initialStateData, null, 2));
            
            if (!fs.existsSync('tmp')) {
                fs.mkdirSync('tmp');
            }
            fs.writeFileSync('tmp/initial-state-data.json', JSON.stringify(initialStateData, null, 2), 'utf8');
            console.log('\nInitial state data saved to tmp/initial-state-data.json');
        } else {
            console.log('\nNo window.__INITIAL_STATE__ data found. Searching for other JSON data...');
            searchForJSONData(htmlContent);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    fetchHTML,
    extractInitialState,
    searchForJSONData
};