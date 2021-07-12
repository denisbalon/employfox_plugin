const resultsSelector = '.entity-result';
const linkSelector = '.entity-result__title-text a.app-aware-link';
let openCounter = sessionCounter = 0;

console.log('employfox initialized');
  
chrome.storage.local.get(['openCounter'], function(result) {
    console.log('Page open counter from storage: ' + result.openCounter);
    if (result.openCounter) {
        openCounter = result.openCounter;
    }
});

let pagesQueue = [];


// To parse single person page. Need only for debug.
// function initSinglePage() {
//      scrollIframeAndParse({contentWindow : window}, null);
// }
// initSinglePage();


let oldHref = document.location.href;

let bodyList = document.querySelector("body");

let observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (oldHref != document.location.href) {
            oldHref = document.location.href;

            console.log('location changed');
            setTimeout(processResults, 1000);
        }
    });

})

let config = {
    childList: true,
    subtree: true
};
observer.observe(bodyList, config);

processResults();

function processResults() {
    pagesQueue = [];

    // Use this to parse everything
    let results = document.querySelectorAll(resultsSelector);

    // Use this if you want to parse only 1st element from results
    // let results1 = document.querySelector(resultsSelector);
    // let results = [results1];

    results.forEach(function(item) {
        let link = item.querySelector(linkSelector);

        if (link) {
            pagesQueue.push({container: item, link: link});
        }
    });
    processQueue();
}

function processQueue() {
    if (pagesQueue.length == 0) {
        return;
    }

    row = pagesQueue.shift();

    setTimeout(function() {
        loadPage(row.container, row.link);
    }, 100);
}

function loadPage(container, link) {
    openCounter++;
    sessionCounter++;
    console.log('Pages opened: ' + openCounter);
    console.log('Current session: ' + sessionCounter);
    chrome.storage.local.set({openCounter: openCounter});
    let iframe = document.createElement('iframe');

    const leftOffset = document.querySelector('#main').offsetLeft;
    const topOffset = document.querySelector('#main').offsetTop;

    // iframe.allowTransparency = true;
    iframe.style.width = '500px';
    iframe.style.height = '200px';
    iframe.style.border = '1px solid #c1c1c1;';
    iframe.style.background = '#fff';
    iframe.style.zIndex = '-99999';
    iframe.style.scroll = 'auto';
    iframe.style.position = 'fixed';
    iframe.style.left = leftOffset+'px';
    iframe.style.top = topOffset+100+'px';
    iframe.src = link.href;
    document.body.append(iframe);

    setTimeout(function() {
        scrollIframeAndParse(iframe, container);
    }, 1000);
}

function scrollIframeAndParse(iframe, container) {
    setTimeout(function() {
        iframe.contentWindow.scrollBy(0, 500);
        setTimeout(function() {
            iframe.contentWindow.scrollBy(0, 500);
            setTimeout(function() {
                iframe.contentWindow.scrollBy(0, 500);
                setTimeout(function() {
                    iframe.contentWindow.scrollBy(0, 500);
                    setTimeout(function() {
                        iframe.contentWindow.scrollBy(0, 500);
                        setTimeout(function() {
                            iframe.contentWindow.scrollBy(0, 500);
                            setTimeout(function() {
                                iframe.contentWindow.scrollBy(0, 500);
                                setTimeout(function() {
                                    iframe.contentWindow.scrollBy(0, 500);
                                    setTimeout(function() {
                                        parseIframeContents(iframe, container);
                                    }, 600);
                                }, 50);
                            }, 50);
                        }, 50);
                    }, 50);
                }, 50);
            }, 50);
        }, 50);
    }, 50);
}

function parseIframeContents(iframe, container) {
    let iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    let profileContainer = iframeDocument.getElementById('profile-wrapper');

    let outputExpList = [];
    let skillsList = [];
    let languagesList = [];
    
    console.log('parsing iframe...');    
                                    
    if (profileContainer) {

        // Parse experience
        profileContainer.querySelector('.pv-experience-section__see-more .pv-profile-section__text-truncate-toggle')?.click();
        let experiences = profileContainer.querySelectorAll('#experience-section ul.section-info>li');
        experiences.forEach( (expBlock) => {
            let expData = parseExpBlock(expBlock);
            outputExpList.push(expData);
        });

        console.log('parsed Experience', outputExpList);

        // Parse skills
        profileContainer.querySelector('.pv-skills-section__additional-skills')?.click();
        let topSkills = profileContainer.querySelectorAll('.pv-profile-section ol.pv-skill-categories-section__top-skills>li');
        topSkills.forEach( (skillBlock) => {
            let skillData = parseSkillBlock(skillBlock);
            skillsList.push(skillData);
        });

        let skills = profileContainer.querySelectorAll('#skill-categories-expanded .pv-skill-category-list ol.pv-skill-category-list__skills_list>li')
        skills.forEach( (skillBlock) => {
            let skillData = parseSkillBlock(skillBlock);
            skillsList.push(skillData);
        });
        
        console.log('parsed Skills', skillsList);


        // Parse languages
        profileContainer.querySelector('.pv-accomplishments-block__expand')?.click();

        let languages = profileContainer.querySelectorAll('#languages-expandable-content ul.pv-accomplishments-block__list>li');
        languages.forEach( (languageBlock) => {
            let languageData = parseLanguageBlock(languageBlock);
            languagesList.push(languageData);
        });

        console.log('parsed Languages', languagesList);

    }

    // Append experience data
    let outDiv = document.createElement('div');
    outDiv.style.width = "100%";
    outDiv.style.fontSize = "13px";
    outDiv.style.padding = "0 0 0 17px";

    // Example of output:
    //  - Senior Dev, Valant (3 y)
    //  - Senior Dev (1 y) . . . DevPro (3 y)

    let expString = outputExpList.map((companyItem) => {
        if (companyItem.positionsList.length === 1) {
            return ` • ${companyItem.positionsList[0].title}, <b>${companyItem.companyTitle}</b> (${companyItem.positionsList[0].duration})`;
        } else {
            return ' • ' + companyItem.positionsList.map(positionItem => {
                return `${positionItem.title} (${positionItem.duration})`;
            }).join(', ') + `, <b>${companyItem.companyTitle}</b> (${companyItem.companyDuration})`;
        }
    }).join('<br />');
    outDiv.innerHTML = expString;
    container.append(outDiv);

    // Append skills data
    let skillsContainer = document.createElement('ul');
    skillsContainer.classList.add('user_extended_info_block');
    skillsContainer.classList.add('user_extended_info_skills');

    skillsList.forEach((skill) => {
        let item = document.createElement('li');
        item.innerText = skill.title;
        skillsContainer.append(item);
    });

    container.append(skillsContainer);

    // Append language data
    let languageContainer = document.createElement('ul');
    languageContainer.classList.add('user_extended_info_block');
    languageContainer.classList.add('user_extended_info_languages');

    languagesList.forEach((language) => {
        let item = document.createElement('li');
        item.innerHTML = `<b>${language.title}</b> (${language.level})`
        languageContainer.append(item);
    });

    container.append(languageContainer);

    iframe.remove();
    console.log('iframe removed');

    processQueue();
}


function parseExpBlock(expBlock) {
    let outputExp = {
        companyTitle: '',
        companyURL: '',
        companyDuration: '',
        positionsList: [],
    };

    expBlock.querySelector('.pv-entity__paging .pv-profile-section__text-truncate-toggle')?.click();

    let positionsBlocks = expBlock.querySelectorAll('ul.pv-entity__position-group li');

    if (positionsBlocks.length) { // case with multiple positions in this company

        outputExp.companyTitle = expBlock.querySelector('.pv-entity__company-summary-info h3 span:last-of-type')?.innerText;
        outputExp.companyDuration = expBlock.querySelector('.pv-entity__company-summary-info>h4 span:last-of-type')?.innerText;
        outputExp.companyURL = expBlock.querySelector('a[data-control-name=background_details_company]')?.href;

        positionsBlocks.forEach((positionBlock) => {
            let positionItem = {
                title: '',
                period: null,
                duration: '',
                description: '',
                region: '',
            };
            positionItem.title = positionBlock.querySelector('.pv-entity__summary-info-v2 h3 span:last-of-type')?.innerText;
            positionItem.duration = positionBlock.querySelector('.pv-entity__summary-info-v2>div>h4:last-of-type span:last-of-type')?.innerText;
            positionItem.region = positionBlock.querySelector('.pv-entity__location span:last-of-type')?.innerText;
            positionItem.description = positionBlock.querySelector('.pv-entity__description')?.innerText;

            outputExp.positionsList.push(positionItem);
        });

    } else { // case when there only one position in this company

        outputExp.companyTitle = expBlock.querySelector('.pv-entity__summary-info .pv-entity__secondary-title')?.innerText;
        outputExp.companyURL = expBlock.querySelector('a[data-control-name=background_details_company]')?.href;

        let positionItem = {
            title: '',
            period: null,
            duration: '',
            description: '',
            region: '',
        };

        positionItem.title = expBlock.querySelector('.pv-entity__summary-info h3')?.innerText;
        positionItem.duration = expBlock.querySelector('.pv-entity__summary-info>div>h4:last-of-type span:last-of-type')?.innerText;
        positionItem.region = expBlock.querySelector('.pv-entity__location span:last-of-type')?.innerText;

        outputExp.positionsList.push(positionItem);
    }

    return outputExp;
}

function parseSkillBlock(skillBlock) {
    let skillData = {
        title: '',
        endorsements: 0
    };

    skillData.title = skillBlock.querySelector('.pv-skill-category-entity__skill-wrapper p.pv-skill-category-entity__name span.pv-skill-category-entity__name-text')?.innerText;
    skillData.endorsements = skillBlock.querySelector('.pv-skill-category-entity__skill-wrapper a .pv-skill-category-entity__endorsement-count')?.innerText;

    return skillData;
}

function parseLanguageBlock(languageBlock) {
    let languageData = {
        title: '',
        level: ''
    };

    let titleContainer = languageBlock.querySelector('h4.pv-accomplishment-entity__title');

    if (titleContainer) {
        languageData.title = Array.from(titleContainer.childNodes).filter((node) => { return node.nodeType == 3 }).map((node) => { return node.nodeValue }).join('');
        languageData.level = languageBlock.querySelector('.pv-accomplishment-entity__proficiency')?.innerText;
    }

    return languageData;
}


function randomTimeout(min, max) {
    return Math.round(Math.random() * (max - min)) + min;
}
