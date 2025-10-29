const fs = require('fs');

function parseCircleCode(circleCode) {
    if (!circleCode) return [];
    
    let code = circleCode.replace(/\s*\([^)]*\)\s*$/, '');
    
    const codes = code.split('/').map(c => c.trim());
    const booths = [];
    
    for (const singleCode of codes) {
        // Check if it's a two-letter prefix format (like AB-37, AB-38)
        const twoLetterMatch = singleCode.match(/^([A-Z]{2})-(\d+)$/);
        if (twoLetterMatch) {
            booths.push(singleCode);
            continue;
        }
        
        // Handle formats like O-16ab, Q-42ab, etc.
        const match = singleCode.match(/^([A-Z]+)-(\d+)([ab]*)$/);
        if (match) {
            const [, prefix, number, suffix] = match;
            
            if (suffix === '') {
                booths.push(singleCode);
            } else if (suffix === 'a' || suffix === 'b') {
                booths.push(singleCode);
            } else if (suffix === 'ab') {
                booths.push(`${prefix}-${number}a`);
                booths.push(`${prefix}-${number}b`);
            } else {
                booths.push(singleCode);
            }
        } else {
            booths.push(singleCode);
        }
    }
    
    return booths;
}

function normalizeDay(day) {
    if (!day) return 'BOTH';
    
    const dayUpper = day.toUpperCase();
    if (dayUpper.includes('SAT') && dayUpper.includes('SUN')) {
        return 'BOTH';
    } else if (dayUpper.includes('SAT')) {
        return 'SAT';
    } else if (dayUpper.includes('SUN')) {
        return 'SUN';
    } else {
        return 'BOTH';
    }
}

function extractUrls(circle) {
    const urls = [];
    
    function detectPlatform(url) {
        const lowerUrl = url.toLowerCase();
        
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            return 'YouTube';
        }
        
        if (lowerUrl.includes('tiktok.com')) {
            return 'TikTok';
        }
        
        if (lowerUrl.includes('twitch.tv')) {
            return 'Twitch';
        }
        
        if (lowerUrl.includes('carrd.co')) {
            return 'Carrd';
        }
        
        if (lowerUrl.includes('linktr.ee')) {
            return 'Linktree';
        }
        
        if (lowerUrl.includes('ko-fi.com')) {
            return 'Ko-fi';
        }
        
        if (lowerUrl.includes('patreon.com')) {
            return 'Patreon';
        }
        
        if (lowerUrl.includes('pixiv.net')) {
            return 'Pixiv';
        }
        
        if (lowerUrl.includes('deviantart.com') || lowerUrl.includes('deviantart.net')) {
            return 'DeviantArt';
        }
        
        if (lowerUrl.includes('artstation.com')) {
            return 'ArtStation';
        }
        
        if (lowerUrl.includes('tumblr.com')) {
            return 'Tumblr';
        }
        
        if (lowerUrl.includes('reddit.com')) {
            return 'Reddit';
        }
        
        if (lowerUrl.includes('discord.gg') || lowerUrl.includes('discord.com')) {
            return 'Discord';
        }
        
        if (lowerUrl.includes('github.com')) {
            return 'GitHub';
        }
        
        if (lowerUrl.includes('.myportfolio.com') || 
            lowerUrl.includes('.portfolio.com') ||
            lowerUrl.includes('.wixsite.com') ||
            lowerUrl.includes('.squarespace.com') ||
            lowerUrl.includes('.weebly.com') ||
            lowerUrl.includes('.wordpress.com') ||
            lowerUrl.includes('.blogspot.com') ||
            lowerUrl.includes('.tumblr.com')) {
            return 'Portfolio';
        }
        
        // Personal website detection (has name-like patterns)
        if (lowerUrl.match(/^https?:\/\/(www\.)?[a-zA-Z0-9-]+\.(com|net|org|id|co|io|me|dev)$/)) {
            return 'Website';
        }
        
        // Default fallback
        return 'Other';
    }
    
    function validateAndFixUrl(url, fieldName = '') {
        if (!url || !url.trim()) return null;
        
        let cleanUrl = url.trim();
        
        if (cleanUrl === '-' || cleanUrl === 'null' || cleanUrl === '') {
            return null;
        }
        
        // Fix common URL issues
        // Fix missing protocol
        if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
            // Check if it looks like a URL
            if (cleanUrl.includes('.') && (cleanUrl.includes('www.') || cleanUrl.includes('.com') || cleanUrl.includes('.net') || cleanUrl.includes('.org'))) {
                cleanUrl = 'https://' + cleanUrl;
            } else if (cleanUrl.startsWith('x.com/') || cleanUrl.startsWith('twitter.com/')) {
                cleanUrl = 'https://' + cleanUrl;
            } else if (cleanUrl.startsWith('instagram.com/')) {
                cleanUrl = 'https://' + cleanUrl;
            } else if (cleanUrl.startsWith('facebook.com/')) {
                cleanUrl = 'https://' + cleanUrl;
            } else if (cleanUrl.startsWith('youtube.com/')) {
                cleanUrl = 'https://' + cleanUrl;
            } else if (cleanUrl.startsWith('tiktok.com/')) {
                cleanUrl = 'https://' + cleanUrl;
            } else if (cleanUrl.startsWith('@')) {
                // Handle @username format based on field context
                const username = cleanUrl.substring(1);
                if (fieldName.includes('instagram')) {
                    cleanUrl = 'https://instagram.com/' + username;
                } else if (fieldName.includes('twitter')) {
                    cleanUrl = 'https://x.com/' + username;
                } else if (fieldName.includes('other_socials')) {
                    return null; // Skip @usernames in other_socials as they're likely invalid
                } else {
                    // Default fallback - skip if we can't determine context
                    return null;
                }
            } else {
                // If it doesn't look like a URL, skip it
                return null;
            }
        }
        
        // Basic URL validation - must contain a dot and look like a URL
        if (!cleanUrl.includes('.') || cleanUrl.length < 10) {
            return null;
        }
        
        return cleanUrl;
    }
    
    // Helper function to parse URLs with multiple separators
    function parseUrls(urlString, fieldName = '') {
        if (!urlString || !urlString.trim()) return [];
        
        // Split by multiple separators: comma, dash, or multiple spaces
        const urlList = urlString
            .split(/[,-\s]+/)  // Split by comma, dash, or whitespace
            .map(url => url.trim())
            .filter(url => url && url !== '-')
            .map(url => validateAndFixUrl(url, fieldName))
            .filter(url => url !== null);
        
        return urlList;
    }
    
    // Helper function to add multiple URLs of the same type
    function addMultipleUrls(urlString, baseTitle, fieldName = '') {
        const urlList = parseUrls(urlString, fieldName);
        
        if (urlList.length === 0) return;
        
        if (urlList.length === 1) {
            // For other_socials, use smart platform detection
            if (fieldName.includes('other_socials')) {
                const platform = detectPlatform(urlList[0]);
                urls.push({
                    title: platform,
                    url: urlList[0]
                });
            } else {
                urls.push({
                    title: baseTitle,
                    url: urlList[0]
                });
            }
        } else {
            urlList.forEach((url, index) => {
                // For other_socials, use smart platform detection
                if (fieldName.includes('other_socials')) {
                    const platform = detectPlatform(url);
                    urls.push({
                        title: `${platform} ${index + 1}`,
                        url: url
                    });
                } else {
                    urls.push({
                        title: `${baseTitle} ${index + 1}`,
                        url: url
                    });
                }
            });
        }
    }
    
    // Add marketplace link
    if (circle.marketplace_link && circle.marketplace_link.trim()) {
        const marketplaceUrl = validateAndFixUrl(circle.marketplace_link, 'marketplace');
        if (marketplaceUrl) {
            urls.push({
                title: "Marketplace",
                url: marketplaceUrl
            });
        }
    }
    
    // Add Facebook
    addMultipleUrls(circle.circle_facebook, "Facebook", "facebook");
    
    // Add Instagram
    addMultipleUrls(circle.circle_instagram, "Instagram", "instagram");
    
    // Add Twitter
    addMultipleUrls(circle.circle_twitter, "Twitter", "twitter");
    
    // Add other socials
    addMultipleUrls(circle.circle_other_socials, "Other", "other_socials");
    
    return urls;
}

// Function to extract works types from circle data
function extractWorksTypes(circle) {
    const worksTypes = [];
    
    // Map the Sells fields to readable names
    const worksMapping = {
        'SellsCommision': 'Commission',
        'SellsComic': 'Comic',
        'SellsArtbook': 'Artbook',
        'SellsPhotobookGeneral': 'Photobook General',
        'SellsPhotobookCosplay': 'Photobook Cosplay',
        'SellsNovel': 'Novel',
        'SellsGame': 'Game',
        'SellsMusic': 'Music',
        'SellsGoods': 'Goods',
        'SellsHandmadeCrafts': 'Handmade Crafts',
        'SellsMagazine': 'Magazine'
    };
    
    // Check each field and add to worksTypes if true
    for (const [field, displayName] of Object.entries(worksMapping)) {
        if (circle[field] === true) {
            worksTypes.push(displayName);
        }
    }
    
    return worksTypes;
}

// Function to extract fandoms from circle data
function extractFandoms(circle, fandomMapping = {}) {
    const fandoms = [];
    
    // Helper function to add fandoms from a field
    function addFandomsFromField(fieldValue) {
        if (!fieldValue || !fieldValue.trim()) return;
        
        // Smart comma splitting that respects parentheses
        function smartSplit(text) {
            const result = [];
            let current = '';
            let depth = 0;
            
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                
                if (char === '(') {
                    depth++;
                    current += char;
                } else if (char === ')') {
                    depth--;
                    current += char;
                } else if (char === ',' && depth === 0) {
                    // Only split on commas that are not inside parentheses
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            
            // Add the last part
            if (current.trim()) {
                result.push(current.trim());
            }
            
            return result;
        }
        
        // Split by comma (respecting parentheses) and clean up each fandom
        const fandomList = smartSplit(fieldValue)
            .filter(fandom => fandom && fandom !== '-')
            .map(fandom => {
                // Capitalize first letter of each word
                return fandom.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
            })
            .filter(fandom => {
                // Remove standalone "etc" variations but keep meaningful ones
                const lowerFandom = fandom.toLowerCase();
                return !(lowerFandom === 'etc' || lowerFandom === 'etc.');
            });
        
        fandoms.push(...fandomList);
    }
    
    // Add fandoms from main fandom field
    addFandomsFromField(circle.fandom);
    
    // Add fandoms from other_fandom field
    addFandomsFromField(circle.other_fandom);
    
    // Remove duplicates from raw fandoms
    const rawFandoms = [...new Set(fandoms)];
    
    // Map fandoms using fandom-mapping.json
    function mapFandom(fandom) {
        // O(1) case-insensitive lookup using pre-built index
        const fandomLower = fandom.toLowerCase();
        const mappedValue = fandomMapping[fandomLower];
        
        if (mappedValue !== undefined) {
            return mappedValue;
        }
        
        // If not found in mapping, return as is
        return [fandom];
    }
    
    // Map all raw fandoms and flatten the result
    const mappedFandoms = rawFandoms
        .flatMap(mapFandom)
        .filter(fandom => fandom && fandom.trim()); // Remove empty strings
    
    // Remove duplicates and sort alphabetically
    const finalMappedFandoms = [...new Set(mappedFandoms)]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    
    return {
        raw_fandoms: rawFandoms,
        fandoms: finalMappedFandoms
    };
}

// Function to extract sampleworks images from circle data
function extractSampleworksImages(circle) {
    // Always return an array - empty if null/undefined/invalid
    if (!circle.sampleworks_images || !Array.isArray(circle.sampleworks_images)) {
        return [];
    }
    
    // Filter out empty or invalid URLs
    return circle.sampleworks_images
        .filter(url => url && typeof url === 'string' && url.trim() !== '')
        .map(url => url.trim());
}

// Function to extract circle cut image URL from circle data
function extractCircleCut(circle) {
    if (!circle.circle_cut || typeof circle.circle_cut !== 'string' || circle.circle_cut.trim() === '') {
        return null;
    }
    
    return circle.circle_cut.trim();
}

// Function to extract circle code from circle data
function extractCircleCode(circle) {
    if (!circle.circle_code || typeof circle.circle_code !== 'string' || circle.circle_code.trim() === '') {
        return null;
    }
    
    return circle.circle_code.trim();
}

// Function to process the initial state data
function processInitialStateData(data) {
    const processedData = [];
    
    if (!data.circle || !data.circle.allCircle) {
        console.error('Invalid data structure: missing circle.allCircle');
        return processedData;
    }
    
    // Load fandom mapping and create lowercase index for O(1) lookups
    let fandomMappingIndex = {};
    try {
        const fandomMappingRaw = fs.readFileSync('data/fandom-mapping.json', 'utf8');
        const fandomMapping = JSON.parse(fandomMappingRaw);
        
        // Build lowercase-to-value index in one pass
        for (const [key, value] of Object.entries(fandomMapping)) {
            fandomMappingIndex[key.toLowerCase()] = value;
        }
        
        console.log(`Loaded fandom mapping with ${Object.keys(fandomMapping).length} entries`);
    } catch (error) {
        console.log('Warning: Could not load fandom-mapping.json:', error.message);
        console.log('Continuing without fandom mapping...');
    }
    
    console.log(`Processing ${data.circle.allCircle.length} circles...`);
    
    for (const circle of data.circle.allCircle) {
        const booths = parseCircleCode(circle.circle_code);
        const urls = extractUrls(circle);
        const fandomsData = extractFandoms(circle, fandomMappingIndex);
        const worksTypes = extractWorksTypes(circle);
        const sampleworksImages = extractSampleworksImages(circle);
        const circleCut = extractCircleCut(circle);
        const circleCode = extractCircleCode(circle);
        
        const processedCircle = {
            id: circle.id,
            user_id: circle.user_id,
            name: circle.name,
            booths: booths,
            day: normalizeDay(circle.day)
        };
        
        // Only add urls array if there are any URLs
        if (urls.length > 0) {
            processedCircle.urls = urls;
        }
        
        // Add raw_fandoms if there are any
        if (fandomsData.raw_fandoms.length > 0) {
            processedCircle.raw_fandoms = fandomsData.raw_fandoms;
        }
        
        // Only add fandoms array if there are any mapped fandoms
        if (fandomsData.fandoms.length > 0) {
            processedCircle.fandoms = fandomsData.fandoms;
        }
        
        // Only add works_type array if there are any works types
        if (worksTypes.length > 0) {
            processedCircle.works_type = worksTypes;
        }
        
        // Always add sampleworks_images array (empty if no images)
        processedCircle.sampleworks_images = sampleworksImages;
        
        // Add circle_cut if available
        if (circleCut) {
            processedCircle.circle_cut = circleCut;
        }
        
        // Add circle_code if available
        if (circleCode) {
            processedCircle.circle_code = circleCode;
        }
        
        processedData.push(processedCircle);
        
        // Log some examples for verification
        if (processedData.length <= 10) {
            console.log(`Example ${processedData.length}:`, {
                name: circle.name,
                circle_code: circleCode || 'none',
                booths: booths,
                day: processedCircle.day,
                urls: urls.length > 0 ? urls : 'none',
                raw_fandoms: fandomsData.raw_fandoms.length > 0 ? fandomsData.raw_fandoms : 'none',
                fandoms: fandomsData.fandoms.length > 0 ? fandomsData.fandoms : 'none',
                works_type: worksTypes.length > 0 ? worksTypes : 'none',
                sampleworks_images: sampleworksImages.length > 0 ? `${sampleworksImages.length} images` : 'empty array',
                circle_cut: circleCut ? 'present' : 'none'
            });
        }
    }
    
    return processedData;
}

// Function to validate the processed data
function validateProcessedData(data) {
    console.log('\n=== VALIDATION ===');
    console.log(`Total processed circles: ${data.length}`);
    
    // Count by day
    const dayCounts = data.reduce((acc, circle) => {
        acc[circle.day] = (acc[circle.day] || 0) + 1;
        return acc;
    }, {});
    console.log('Day distribution:', dayCounts);
    
    // Count total booths
    const totalBooths = data.reduce((acc, circle) => acc + circle.booths.length, 0);
    console.log(`Total booths: ${totalBooths}`);
    
    // Count circles with URLs
    const circlesWithUrls = data.filter(circle => circle.urls && circle.urls.length > 0);
    console.log(`Circles with URLs: ${circlesWithUrls.length}`);
    
    // Count circles with fandoms
    const circlesWithFandoms = data.filter(circle => circle.fandoms && circle.fandoms.length > 0);
    console.log(`Circles with fandoms: ${circlesWithFandoms.length}`);
    
    // Count circles with works types
    const circlesWithWorksTypes = data.filter(circle => circle.works_type && circle.works_type.length > 0);
    console.log(`Circles with works types: ${circlesWithWorksTypes.length}`);
    
    // Count circles with sampleworks images
    const circlesWithSampleworksImages = data.filter(circle => circle.sampleworks_images && circle.sampleworks_images.length > 0);
    console.log(`Circles with sampleworks images: ${circlesWithSampleworksImages.length}`);
    
    // Count circles with circle_cut
    const circlesWithCircleCut = data.filter(circle => circle.circle_cut);
    console.log(`Circles with circle_cut: ${circlesWithCircleCut.length}`);
    
    // Count circles with circle_code
    const circlesWithCircleCode = data.filter(circle => circle.circle_code);
    console.log(`Circles with circle_code: ${circlesWithCircleCode.length}`);
    
    // Count URL types
    const urlTypeCounts = {};
    circlesWithUrls.forEach(circle => {
        circle.urls.forEach(urlObj => {
            urlTypeCounts[urlObj.title] = (urlTypeCounts[urlObj.title] || 0) + 1;
        });
    });
    console.log('URL type distribution:', urlTypeCounts);
    
    // Count works type popularity
    const worksTypeCounts = {};
    circlesWithWorksTypes.forEach(circle => {
        circle.works_type.forEach(worksType => {
            worksTypeCounts[worksType] = (worksTypeCounts[worksType] || 0) + 1;
        });
    });
    console.log('\nWorks type distribution:', worksTypeCounts);
    
    // Count fandom popularity
    const fandomCounts = {};
    circlesWithFandoms.forEach(circle => {
        circle.fandoms.forEach(fandom => {
            fandomCounts[fandom] = (fandomCounts[fandom] || 0) + 1;
        });
    });
    
    // Show top 10 most popular fandoms
    const topFandoms = Object.entries(fandomCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    console.log('\nTop 10 most popular fandoms:', topFandoms);
    
    // Show some examples with URLs, fandoms, works types, sampleworks images, circle_cut, and circle_code
    console.log('\nExamples with URLs, fandoms, works types, sampleworks images, circle_cut, and circle_code:');
    const examplesWithData = circlesWithWorksTypes.slice(0, 5).map(circle => ({
        name: circle.name,
        booths: circle.booths,
        urls: circle.urls || 'none',
        fandoms: circle.fandoms || 'none',
        works_type: circle.works_type,
        sampleworks_images: circle.sampleworks_images.length > 0 ? `${circle.sampleworks_images.length} images` : 'empty array',
        circle_cut: circle.circle_cut ? 'present' : 'none',
        circle_code: circle.circle_code || 'none'
    }));
    console.log(JSON.stringify(examplesWithData, null, 2));
}

// Function to load and apply overrides
function loadAndApplyOverrides(processedData) {
    try {
        const overrideData = JSON.parse(fs.readFileSync('config/override.json', 'utf8'));
        
        if (!overrideData.creators || !Array.isArray(overrideData.creators)) {
            console.log('No valid override data found');
            return processedData;
        }
        
        console.log(`Found ${overrideData.creators.length} override entries`);
        
        // Apply overrides
        overrideData.creators.forEach(override => {
            const targetIndex = processedData.findIndex(creator => creator.id === override.id);
            
            if (targetIndex !== -1) {
                console.log(`Applying override for creator ID ${override.id} (${processedData[targetIndex].name})`);
                
                // Apply overrides - merge/override existing properties
                if (override.profileImage) {
                    processedData[targetIndex].profileImage = override.profileImage;
                }
                
                if (override.informations) {
                    processedData[targetIndex].informations = override.informations;
                }
                
                if (override.urls) {
                    processedData[targetIndex].urls = override.urls;
                }
                
                // Apply any other properties that might exist
                Object.keys(override).forEach(key => {
                    if (!['id', 'profileImage', 'informations', 'urls'].includes(key)) {
                        processedData[targetIndex][key] = override[key];
                    }
                });
            } else {
                console.log(`Warning: Override for ID ${override.id} not found in processed data`);
            }
        });
        
        return processedData;
    } catch (error) {
        console.log('Error loading override file:', error.message);
        return processedData;
    }
}

// Function to compare data and bump version if needed
function compareAndBumpVersion(newData) {
    try {
        // Read current creator-data.json
        let currentData = null;
        try {
            const currentDataRaw = fs.readFileSync('data/creator-data.json', 'utf8');
            currentData = JSON.parse(currentDataRaw);
        } catch (error) {
            console.log('No existing creator-data.json found, will create new one');
        }
        
        // Read current version.json
        let versionData = null;
        try {
            const versionRaw = fs.readFileSync('version.json', 'utf8');
            versionData = JSON.parse(versionRaw);
        } catch (error) {
            console.log('No version.json found, creating new one');
            versionData = {
                current_version: 1,
                release_notes: "Initial version",
                creator_data_version: 1
            };
        }
        
        // Compare data (only compare creators array)
        const currentCreators = currentData ? currentData.creators : null;
        const dataChanged = !currentCreators || JSON.stringify(currentCreators) !== JSON.stringify(newData);
        
        if (dataChanged) {
            console.log('Data has changed, updating creator-data.json and bumping version...');
            
            // Get current version from creator-data.json or start from 1
            const currentVersion = currentData ? currentData.version || 0 : 0;
            const newVersion = currentVersion + 1;
            
            // Create new data structure with version
            const newCreatorData = {
                version: newVersion,
                creators: newData
            };
            
            // Save new creator data
            fs.writeFileSync('data/creator-data.json', JSON.stringify(newCreatorData, null, 2), 'utf8');
            console.log('✅ Updated data/creator-data.json');
            
            // Sync version.json to match creator-data.json
            versionData.creator_data_version = newVersion;
            
            // Save updated version
            fs.writeFileSync('version.json', JSON.stringify(versionData, null, 2), 'utf8');
            console.log(`✅ Synced version.json to ${newVersion}`);
            
            return true; // Data was updated
        } else {
            console.log('No changes detected, skipping update');
            return false; // No changes
        }
        
    } catch (error) {
        console.error('Error comparing and bumping version:', error.message);
        return false;
    }
}

async function main() {
    try {
        console.log('Reading tmp/initial-state-data.json...');
        const rawData = fs.readFileSync('tmp/initial-state-data.json', 'utf8');
        const initialData = JSON.parse(rawData);
        
        console.log('Processing data...');
        const processedData = processInitialStateData(initialData);
        
        console.log('Applying overrides...');
        const finalData = loadAndApplyOverrides(processedData);
        
        console.log('Validating processed data...');
        validateProcessedData(finalData);
        
        // Compare with existing data and bump version if needed
        console.log('\nChecking for data changes...');
        const dataUpdated = compareAndBumpVersion(finalData);
        
        if (dataUpdated) {
            console.log('✅ Successfully processed and saved data!');
            console.log(`📁 Updated: data/creator-data.json and version.json`);
            console.log(`📊 Processed ${finalData.length} circles`);
            console.log('🔄 Version bumped due to data changes');
        } else {
            console.log('ℹ️  No changes detected, no files updated');
        }
        
    } catch (error) {
        console.error('❌ Error processing data:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = {
    parseCircleCode,
    normalizeDay,
    processInitialStateData,
    extractSampleworksImages,
    extractCircleCut,
    extractCircleCode
};
