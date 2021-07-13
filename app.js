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

document.addEventListener('click',function(e) {
    if (e.target && e.target.classList.contains('user_extended_info_experience_expand')) {
        e.preventDefault();
        e.target.previousElementSibling.classList.remove('user_extended_info_experience_hidden');
        e.target.remove();
     }
 });

processResults();

function processResults() {
    pagesQueue = [];

    // Use this to parse everything
    let results = document.querySelectorAll(resultsSelector);

    // Use this if you want to parse only 1st element from results
    // let results = [document.querySelector(resultsSelector)].filter((item) => { return !!item; });

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
    iframe.style.height = '400px';
    iframe.style.border = '1px solid #c1c1c1;';
    iframe.style.background = '#fff';
    iframe.style.zIndex = '-99999';
    iframe.style.scroll = 'auto';
    iframe.style.position = 'fixed';
    iframe.style.left = leftOffset+50+'px';
    iframe.style.top = topOffset+50+'px';
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
                                        expandHiddenSections(iframe, container);
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

function expandHiddenSections(iframe, container) {
    let iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
    let profileContainer = iframeDocument.getElementById('profile-wrapper');

    if (profileContainer) {
        profileContainer.querySelector('.pv-experience-section__see-more .pv-profile-section__text-truncate-toggle')?.click();
        iframe.contentWindow.scrollBy(0, 500);
        setTimeout(function() {
            profileContainer.querySelector('.pv-skills-section__additional-skills')?.click();
            iframe.contentWindow.scrollBy(0, 500);
            setTimeout(function() {
                profileContainer.querySelector('.pv-accomplishments-block__expand[aria-controls="languages-expandable-content"]')?.click();
                setTimeout(function() {
                    parseIframeContents(iframe, container, profileContainer);
                }, 200);
            }, 100);
        }, 100);
    } else {
        parseIframeContents(iframe, container, profileContainer);
    }
}

function parseIframeContents(iframe, container, profileContainer) {
    console.log('parsing iframe...');    

    let outputExpList = parseExperience(profileContainer);
    let skillsList = parseSkills(profileContainer);
    let languagesList = parseLanguages(profileContainer);

    drawUserData(outputExpList, skillsList, languagesList, container);

    iframe.remove();
    console.log('iframe removed');

    processQueue();
}

function parseExperience(profileContainer) {
    let outputExpList = [];
    if (!profileContainer) {
        return outputExpList;
    }

    let experiences = profileContainer.querySelectorAll('#experience-section ul.section-info>li');
    experiences.forEach( (expBlock) => {
        let expData = parseExpBlock(expBlock);
        outputExpList.push(expData);
    });

    console.log('parsed Experience', outputExpList);

    return outputExpList;
}

function parseExpBlock(expBlock) {
    let outputExp = {
        companyTitle: '',
        companyURL: '',
        companyDuration: '',
        companyDurationMonths: 0,
        positionsList: [],
    };

    expBlock.querySelector('.pv-entity__paging .pv-profile-section__text-truncate-toggle')?.click();

    let positionsBlocks = expBlock.querySelectorAll('ul.pv-entity__position-group li');

    if (positionsBlocks.length) { // case with multiple positions in this company

        outputExp.companyTitle = expBlock.querySelector('.pv-entity__company-summary-info h3 span:last-of-type')?.innerText;
        outputExp.companyDuration = expBlock.querySelector('.pv-entity__company-summary-info>h4 span:last-of-type')?.innerText;
        outputExp.companyDurationMonths = parseDuration(outputExp.companyDuration);
        outputExp.companyURL = expBlock.querySelector('a[data-control-name=background_details_company]')?.href;

        positionsBlocks.forEach((positionBlock) => {
            let positionItem = {
                title: '',
                period: null,
                duration: '',
                durationMonths: 0,
                description: '',
                region: '',
            };
            positionItem.title = positionBlock.querySelector('.pv-entity__summary-info-v2 h3 span:last-of-type')?.innerText;
            positionItem.duration = positionBlock.querySelector('.pv-entity__summary-info-v2>div>h4:last-of-type span:last-of-type')?.innerText;
            positionItem.durationMonths = parseDuration(positionItem.duration);

            positionItem.region = positionBlock.querySelector('.pv-entity__location span:last-of-type')?.innerText;
            positionItem.description = visibleText(positionBlock.querySelector('.pv-entity__description'));

            outputExp.positionsList.push(positionItem);
        });

    } else { // case when there only one position in this company
        outputExp.companyTitle = visibleText(expBlock.querySelector('.pv-entity__summary-info .pv-entity__secondary-title'));

        outputExp.companyURL = expBlock.querySelector('a[data-control-name=background_details_company]')?.href;

        let positionItem = {
            title: '',
            period: null,
            duration: '',
            durationMonths: 0,
            description: '',
            region: '',
        };

        positionItem.title = expBlock.querySelector('.pv-entity__summary-info h3')?.innerText;
        positionItem.duration = expBlock.querySelector('.pv-entity__summary-info>div>h4:last-of-type span:last-of-type')?.innerText;
        positionItem.durationMonths = parseDuration(positionItem.duration);
        positionItem.region = expBlock.querySelector('.pv-entity__location span:last-of-type')?.innerText;
        positionItem.description = visibleText(expBlock.querySelector('.pv-entity__description'));

        outputExp.positionsList.push(positionItem);
        outputExp.companyDuration = positionItem.duration;
        outputExp.companyDurationMonths = positionItem.durationMonths;
    }

    return outputExp;
}

function parseSkills(profileContainer) {
    let skillsList = [];

    if (!profileContainer) {
        return skillsList;
    }

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

    return skillsList;
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

function parseLanguages(profileContainer) {
    let languagesList = [];

    if (!profileContainer) {
        return languagesList;
    }
    
    let languages = profileContainer.querySelectorAll('#languages-expandable-content ul.pv-accomplishments-block__list>li');
    languages.forEach( (languageBlock) => {
        let languageData = parseLanguageBlock(languageBlock);
        languagesList.push(languageData);
    });

    console.log('parsed Languages', languagesList);

    return languagesList;
}

function parseLanguageBlock(languageBlock) {
    let languageData = {
        title: '',
        level: ''
    };

    languageData.title = visibleText(languageBlock.querySelector('h4.pv-accomplishment-entity__title'));
    languageData.level = languageBlock.querySelector('.pv-accomplishment-entity__proficiency')?.innerText;

    return languageData;
}

function parseDuration(durationString) {
    let durationParsed = durationString.match(/(\d+)*(\d+)/g);
    if (durationParsed.length == 1) {
        durationParsed.unshift(0);
    }
    return Number(durationParsed[1] || 0) + Number(durationParsed[0] || 0) * 12;
}

function drawUserData(outputExpList, skillsList, languagesList, container) {
    let additionalInfoContainer = document.createElement('div');
    additionalInfoContainer.classList.add('user_extended_info_container');

    let leftColumnContainer = document.createElement('div');
    leftColumnContainer.classList.add('user_extended_info_column');
    additionalInfoContainer.append(leftColumnContainer);

    let rightColumnContainer = document.createElement('div');
    rightColumnContainer.classList.add('user_extended_info_column');
    additionalInfoContainer.append(rightColumnContainer);

    container.append(additionalInfoContainer);

    leftColumnContainer.append(prepareExperience(outputExpList));
    rightColumnContainer.append(prepareSkills(skillsList));
    rightColumnContainer.append(prepareLanguages(languagesList));
}

function prepareExperience(outputExpList) {
    let outDiv = document.createElement('div');
    outDiv.style.width = "100%";
    outDiv.style.fontSize = "13px";
    outDiv.style.padding = "0 0 0 17px";

    // Example of output:
    //  - Senior Dev, Valant (3 y)
    //  - Senior Dev (1 y) . . . DevPro (3 y)

    let totalExpMonths = outputExpList.map((item) => { return item.companyDurationMonths }).reduce((total, item) => { return total + item }, 0);
    let totalExpString = 'Опыт:';
    if (outputExpList.length == 0 || !totalExpMonths) {
        totalExpString += ' нет';
    } else {
        if (Math.floor(totalExpMonths/12) > 0) {
            totalExpString += ` ${ Math.floor(totalExpMonths/12) } лет`;
        }
        if ((totalExpMonths % 12) > 0) {
            totalExpString += ` ${ totalExpMonths % 12 } мес`;
        }
        totalExpString += `, ${ outputExpList.length } комп.`;
    }

    let expString = outputExpList.map((companyItem) => {
        return ' • ' + preparePositionsList(companyItem) + `, <b>${prepareCompanyTitle(companyItem)}</b> (${companyItem.companyDuration})`;
    }).join('<br />');
    outDiv.innerHTML = totalExpString + '<br />' + expString;

    return outDiv;
}

function preparePositionTitle(positionItem) {
    if (positionItem.description) {
        return `<span title="${positionItem.description}">${positionItem.title}</span>`;
    } else {
        return positionItem.title;
    }
}

function prepareCompanyTitle(companyItem) {
    let url = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(searchQuery())}%20${encodeURIComponent(companyItem.companyTitle)}&origin=GLOBAL_SEARCH_HEADER`
    return `${companyItem.companyTitle} <a class="user_extended_info_company_search_icon" href="${url}" target="_blank"></a>`;
}

function preparePositionsList(companyItem) {
    if (companyItem.positionsList.length === 1) {
        return preparePositionTitle(companyItem.positionsList[0]);
    } else {
        let output = `${preparePositionTitle(companyItem.positionsList[0])} (${companyItem.positionsList[0].duration})`;

        output += '<span class="user_extended_info_experience_hidden">, ';
        output += companyItem.positionsList.slice(1).map(positionItem => {
            return `${preparePositionTitle(positionItem)} (${positionItem.duration})`;
        }).join(', ');
        output += '</span><a class="user_extended_info_experience_expand"> &hellip;</a>';

        return output;
    }
}

function prepareSkills(skillsList) {
    let skillsContainer = document.createElement('ul');
    skillsContainer.classList.add('user_extended_info_block');
    skillsContainer.classList.add('user_extended_info_skills');

    skillsList.forEach((skill) => {
        let item = document.createElement('li');
        item.innerText = skill.title;
        skillsContainer.append(item);
    });

    return skillsContainer;
}

function prepareLanguages(languagesList) {
    let languageContainer = document.createElement('ul');
    languageContainer.classList.add('user_extended_info_block');
    languageContainer.classList.add('user_extended_info_languages');

    languagesList.forEach((language) => {
        let item = document.createElement('li');
        let output = `<b>${language.title}</b>`;
        if (language.level) {
            output += ` (${language.level})`;
        }
        item.innerHTML = output;
        languageContainer.append(item);
    });

    return languageContainer;
}

function randomTimeout(min, max) {
    return Math.round(Math.random() * (max - min)) + min;
}

function visibleText(container) {
    if (!container) {
        return '';
    }
    
    return Array.from(container.childNodes).filter((node) => { return node.nodeType == 3 }).map((node) => { return node.nodeValue }).join('').trim();
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
    console.log('Query variable %s not found', variable);
}

function searchQuery() {
    return getQueryVariable('keywords');
}
