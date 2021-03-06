
const low = require('lowdb'),
    fs = require("fs"),
    { join } = require("path"),
    FileSync = require('lowdb/adapters/FileSync'),
    { ipcRenderer } = require("electron"),
    { jsPDF } = require('jspdf'),
    printer = require('pdf-to-printer'),
    DEFAULT_DB = join(__dirname, 'data.json'),
    DYNAMIC_DB = join(__dirname, 'dbDir.txt'),
    BACKUP_DIR = join(__dirname, 'data_backup.json');

const restoreDefaultDB = () => fs.writeFileSync(DYNAMIC_DB, DEFAULT_DB);
if (!fs.existsSync(DYNAMIC_DB)) restoreDefaultDB();

let db, adapter;
const syncDB = (dir) => {
    adapter = new FileSync(dir);
    db = low(adapter)
}

const dbDir = fs.readFileSync(DYNAMIC_DB, { encoding: 'utf-8', flag: 'r' });
if (!fs.existsSync(dbDir)) {
    alert("File database non trovato. Verra' ripristinato il DB originale.");
    restoreDefaultDB();
    location.reload();
}

// Is DB valid?
try {
    syncDB(dbDir);
}
catch (err) {
    alert(`${err}.\n Verra' ripristinato il DB originale.`);
    restoreDefaultDB();

    // If DEFAULT_DB has been corrupted...
    if (dbDir === DEFAULT_DB) {
        fs.unlinkSync(DEFAULT_DB);
        syncDB(dbDir);
    }

    location.reload();
}

const roomsList = db.get('Rooms'),
    customersList = db.get('Customers'),
    servicesList = db.get('Services'),
    tagsList = db.get('Tags'),
    today = new Date(),
    CLT = document.querySelector('#customerLineTitle'),
    ctxMenu = document.querySelector('#ctxMenu');

let usedMonth = today.getMonth(),
    usedYear = today.getFullYear(),
    selectedElement, currentTable, currentWindow; 

db.defaults({ Rooms: [], Customers: [], Services: [], Tags: [] }).write();

class Element {
    constructor(){
        this.currentList = eval(`${currentTable.id}List`);
        this.form = document.forms[`new${capitalize(currentTable.id.slice(0, -1))}`];
    }

    add() {
        const values = {id: ''};

        if (isFormEmpty(this.form)) {alert('Per favore compilare tutti i campi.'); return; };

        for (const [key, object] of Object.entries(this.form)) {
            if (object.name != '') values[object.name] = object.value;
        }

        switch (this.currentList) {
            case roomsList:
                values.tags = [];
                break;
            case customersList:
                if (values.startDate > values.endDate) {alert('Per favore inserire una data valida.'); return; };
                values.services = [];
                document.querySelectorAll('#servicesList input').forEach(checkbox => {
                    if (checkbox.checked == true) {
                        values.services.push(checkbox.value);
                    }
                });

                values.total = calcTotal(values.services).toString() + '€';
                break;
            case servicesList:
                values.price += '€'
                break;
        }

        this.currentList.push(values).write();
    };

    edit() {
        const list = {};

        Object.entries(this.form).forEach(([key, object]) => {
            if (object.name && object.value && object.name != 'services') list[object.name] = object.value;
        });

        switch (this.currentList) {
            case customersList:
                list.services = [];
                document.querySelectorAll('#servicesList input').forEach(checkbox => {
                    if (checkbox.checked == true) {
                        list.services.push(checkbox.value);
                    }
                });

                list.total = calcTotal(list.services).toString() + '€';
                break;
            case servicesList:
                list.price += '€';
                break;
        }
        
        this.currentList.find({id: selectedElement.id}).assign(list).write();
    };

    del() {
        this.currentList.remove({id: selectedElement.id}).write();
        location.reload();
        return false;
    };

    print = () => printList();
};

class Tag {
    constructor (tag) {
        this.tag = tag;
        this.tags = selectedElement.tags;
    };

    append = () => {
        this.tags.push(this.tag);
        roomsList.write();
    }

    remove = () => {
        for(i=0; i<this.tags.length; i++) {
            if (this.tag == this.tags[i]) this.tags.splice(i, 1);
        }
        roomsList.write();
    }
};

const addClassesToChildren = (parent, ...classes) => {
    const children = parent.childNodes;
    for(i=0; i<children.length; i++) {
        if (classes[i] == '') continue;
        children[i].className = classes[i];
    }
};

const buildPrintList = () => {
    const table = document.querySelector('#printList'),
        values = getRoomsAndNewCustomers();

    Object.entries(values).forEach(([key, value]) => {
        const row = document.createElement('tbody'),
            rowLine = document.createElement('tr'),
            roomValues = value[0],
            customerNum = value.length - 1;

        value.forEach(val => val.forEach(v => { if (Array.isArray(v)) val[val.indexOf(v)] = v.join(', </br>') }));

        if (customerNum == 0) roomValues.push('', '', '', ''); 
        roomValues.forEach(rV => {
            if (rV.length == 0) rV = `<div contentEditable='true' class='noteBox'></div>`;
            rowLine.insertAdjacentHTML('beforeend', `<td rowspan='${customerNum}'>${rV}</td>`);
        });

        row.append(rowLine);

        for (i=1; i<value.length; i++) {
            const customer = value[i];
            
            customer.slice(1,3).forEach(date => customer[customer.indexOf(date)] = new Date(date).toLocaleDateString('it-IT'));
            
            switch (i) {
                case 1:
                    target = rowLine;
                    break;
                default:
                    target = row;
            }

            target.insertAdjacentHTML('beforeend', `<td>${customer.join('</td><td>')}</td>`)
        }

        table.append(row);
    })
}

const capitalize = string => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

const calcTotal = services => {
    let total = 0; 

    services.forEach(s => {
        servicesList.forEach(service => {
            if (s == service.name) total += parseInt(service.price.slice(0, -1));
        }).value();
    })

    return total;
}

const changeContextElement = () => {
    const ctxItems = document.querySelectorAll('.ctxItem'),
        icon = ['plus', 'ellipsis-h', 'trash'],
        operationsIT = ['Aggiungi', 'Modifica', 'Elimina'],
        listsIT = ['Stanza', 'Cliente', 'Servizio'],
        listIndex = ['rooms', 'customers', 'services'].indexOf(currentTable.id),
        listType = listsIT[listIndex];

    for(i=0; i<ctxItems.length; i++){
        const item = ctxItems[i];
    
        if (item.id != 'tags' && item.parentNode.className != 'ctxSubMenu') {
            item.innerHTML = `<i class='fas fa-${icon[i]}'></i>${operationsIT[i]} ${listType}`;
        }
    }
}

const changePlaceholders = () => {
    const formName = `new${capitalize(currentTable.id.slice(0, -1))}`,
        form = document.forms[formName];

    switch (currentWindow.operation) {
        case 'add':
            Object.entries(form).forEach(([key, object]) => {
                if (object.name != 'services') {
                    object.placeholder = ''; 
                    object.value = '';
                };
            });
            break;

        case 'edit':
            const values = getListValues(selectedElement, 'id');
    
            for (i=0; i<values.length-1; i++) {
                const el = Object.entries(form)[i][1];
                if (el.nodeName == 'INPUT' || el.nodeName == 'SELECT') {
                    if (['date', 'select-one'].includes(el.type)) el.value = values[i]; 
                    else el.placeholder = values[i];
                };

                if (formName == 'newCustomer') {
                    document.querySelectorAll('#servicesList input').forEach(checkbox => {
                        if (values[i].includes(checkbox.value)) checkbox.checked = true; 
                        else checkbox.checked = false;
                    });
                }
            };
            break;
    };
};

const checkElementIds = () => {
    [roomsList, customersList, servicesList].forEach(list => {
       list = list.write(); 
       for (i=0; i<list.length; i++) {
          list[i].id = i;
       };
    });
};

const checkTags = () => {
    document.querySelectorAll('.addTag').forEach(button => {
        let ext = 'append';
            if (selectedElement.tags.includes(button.id)) {
                ext = 'remove';
                button.style.backgroundColor = 'lightgrey';
            }

        button.onclick = () => {
            eval(`new Tag(button.id).${ext}()`);

            location.reload();
            return false;
        }   
    })    
};

const continueCustomerLine = (sD, eD) => {
    switch (true) {
        case usedMonth == sD.getMonth():
            eD.setDate(0); 
            sD.setDate(sD.getDate());
            break;
        case usedMonth == eD.getMonth():
            sD.setDate(1); 
            eD.setDate(eD.getDate());
            break;
        case usedMonth > sD.getMonth()
            && usedMonth < eD.getMonth():
            sD.setDate(1);
            eD.setDate(0);
            break;
    }
}

const displayCustomerLines = (percentage) => {
    document.querySelectorAll('.roomsRow').forEach(row => {
        const roomName = row.childNodes[0].innerHTML,
            roomLine = row.childNodes[1].childNodes[0];

        roomLine.innerHTML = '';

        customersList.forEach(customer => {
            const sD = new Date(customer.startDate),
                eD = new Date(customer.endDate),
                values = {0: getListValues(customer, 'id', 'roomName')},
                busyCustomers = isDateBusy(customer);
            
            if (busyCustomers.length > 0) {
                for (i=0; i<busyCustomers.length; i++) {
                    values[i + 1] = getListValues(busyCustomers[i], 'id', 'roomName');
                }
            };

            if (roomName == customer.roomName) {
                if (isInMonth(sD, eD)) {
                    if (eD.getMonth() > sD.getMonth()) continueCustomerLine(sD, eD);

                    const customerLine = document.createElement('div'),
                        i = eD.getDate() - sD.getDate(), 
                        left = percentage * (sD.getDate() * 0.77) + 7.79,
                        lastDay = new Date(eD.getFullYear(), eD.getMonth() + 1, 0).getDate();

                    let width = percentage * i * 0.79;     
                    
                    if (i > 10 && i < 16 || i > 19 && i < 24) width -= 2.3;
                    if (i < 10) width += 1;
                    if (i < 6) {
                        width += 1; 
                    }
                    if (eD.getDate() == lastDay) {
                        if (i < 6) width -= 0.8;
                        width += 3;
                    }

                    customerLine.className = 'customerLine';
                    customerLine.style.cssText = `
                        background-color: ${randomColor()};
                        width: ${width}%;
                        left: ${left}%;`
                    
                    roomLine.append(customerLine);
                    customerLine.onmouseover = (event) => showCustomerLineTitle(event, values);
                    CLT.onmouseout = () => { showItem(CLT, false); CLT.innerHTML = ''; };
                };
            }
        }).value();
    });
};

const displayListItems = ([list, target, elemType, ...params]) => {
    list.forEach(item => {
        const el = document.createElement(elemType);
        eval(`el.innerHTML = item.name`);

        params.forEach(parameter => {
            eval(`el.${parameter} = item.name`);
        });
        
        let label;

        switch (list) {
            case tagsList:
                el.innerHTML = `<i class='fas fa-${item.icon}'></i>` + el.innerHTML;
                el.className = 'ctxItem addTag';
                break;
            case servicesList:
                el.type = 'checkbox';
                el.name = 'services';
                label = document.createElement('label');
                label.innerHTML = label.htmlFor = el.value;
                label.innerHTML += '<br>'
                break;
        }

        target.append(el);
        if (label) target.append(label);
    }).value();
};

const displayTags = row => {
    roomsList.forEach(room => {
        const rowRoomName = row.childNodes[0].innerHTML,
            rowLine = row.childNodes[1];

        if (room.tags && room.name == rowRoomName) {
            room.tags.sort((a, b) => a.localeCompare(b)).forEach(tag => {
                let icon;

                tagsList.forEach(dbTag => {
                    if (tag == dbTag.name) icon = `<i class='fas fa-${dbTag.icon}'></i>`;
                }).value();

                if (room.tags.indexOf(tag) == 0) margin = '50px'; else margin = '0';
                rowLine.insertAdjacentHTML('beforeend', 
                `<div class='tag' style='margin-left: ${margin}'>${icon}${tag}</div>`);
            });
        };
    }).value();
};

const deleteOldCustomers = () => {
    customersList.forEach(customer => {
        if (today.getMonth() - new Date(customer.endDate).getMonth() >= 1) {
            customersList.remove(customer).write()
        }
    }).value()
}

const getListValues = (list, ...exc) => {
    let values = [];

    Object.entries(list).forEach(([key, object]) => {
        let bool = true;

        exc.forEach(exception => {
            if (exception == key) bool = false;
        })

        if (bool) values.push(object);
    })

    return values;
}

const getRoomsAndNewCustomers = () => {
    const values = {};

    roomsList.forEach(room => {
        const roomValues = getListValues(room, 'id'),
            position = roomsList.indexOf(room);

        values[position] = [roomValues];

        customersList.forEach(customer => {
            if (room.name == customer.roomName && new Date(customer.endDate) > today.setDate(today.getDate() - 1)) {
                const customerValues = getListValues(customer, 'id', 'roomName', 'name', 'location', 'total');
                values[position].push(customerValues);
            }
        }).value();
    }).value();

    return values;
}

const hideWindow = (event) => {
    document.querySelectorAll('#windowLevel, #confirmNo').forEach(item => {
        if (event.target == item) {
           [document.querySelector(`#windowLevel`), currentWindow].forEach(item => showItem(item, false));
        };
    }); 
};

const isDateBusy = customer => {
    const sD = new Date(customer.startDate).getTime(),
        eD = new Date(customer.endDate).getTime();

        let busyList = [];
    
    customersList.forEach(c => {
        const sD2 = new Date(c.startDate),
            eD2 = new Date(c.endDate);

        if (c != customer && c.roomName == customer.roomName 
            && isInMonth(sD2, eD2) && ((sD >= sD2.getTime() && sD <= eD2.getTime()) 
            || (sD2.getTime() >= sD && eD2.getTime() <= eD))) {
            busyList.push(c)
        } 
    }).value();

    return busyList;
};

const isFormEmpty = form => {
    let result = false;
    form.childNodes.forEach(child => {
        if (child.name != undefined && child.value.length == 0) result = true;
    })
    return result;
};

const isInMonth = (...dates) => {
    let result = false;
    dates.forEach(date => {
        if (date.getMonth() == usedMonth && date.getFullYear() == usedYear) {result = true; return}
    })
    
    if (dates.length > 1 && usedMonth > dates[0].getMonth() && usedMonth < dates[1].getMonth()) result = true; 

    return result;
};

const listElements = (tableId) => {
    const table = document.querySelector(`#${tableId}`),
        rowClass = `${tableId}Row`,
        list = eval(`${tableId}List`);

    if (tableId == 'customers') ext = 'roomName'; else ext = 'name';

    list.sort((a, b) => eval(`a.${ext}.localeCompare(b.${ext})`)).forEach(item => {
        let values = getListValues(item, 'id', 'tags'), 
            position = list.indexOf(item);

        switch (list) {
            case roomsList:
                values.splice(1, 0, `<div class='roomLine'></div>`);
                if (values[2] == 'matrimoniale') values[2] = 'matrim.';
                break;
            case customersList:
                for (i=3; i<5; i++) {
                    values[i] = new Date(values[i]).toLocaleDateString('it-IT');
                };
                values[6] = values[6].join(', ');
                break;
        }

        table.insertAdjacentHTML('beforeend',
        `<tr class='${rowClass}' id='${rowClass}${position}'><td>${values.join('</td><td>')}</td></tr>`);
    }).value();

    const rows = document.querySelectorAll(`.${rowClass}`);

    if (rows.length == 0) table.oncontextmenu = event => showContextMenu(event, undefined);
    else {
        rows.forEach(row => {        
            table.oncontextmenu = event => showContextMenu(event, row);
            row.oncontextmenu = () => {
                selectedElement = list.write()[row.id.slice(rowClass.length)];
            };

            if (list == roomsList) {
                addClassesToChildren(row, 'roomName', '', 'roomType');
                displayTags(row);
            };
        });
    }
};

const listProvinces = () => {
    const province = new XMLHttpRequest();
    province.open("GET", "assets/other/province.json", false);
    province.send()
    list = JSON.parse(province.responseText);

    list.forEach(item => {
        const name = `${item.name.toUpperCase()} (${item.sigla})`
        document.forms.newCustomer.location.insertAdjacentHTML('beforeend', 
        `<option value='${name}'>${name}</option>`);
    })
}

const printList = async () => {
    const list = document.querySelector('#printList'),
        doc = new jsPDF();
    
    await doc.html(list.outerHTML, {
        html2canvas: {
            onclone: (el) => {
                el.querySelectorAll('.noteBox').forEach(box => box.setAttribute('style', 'border: transparent !important'));
                el.querySelectorAll('tbody').forEach(row => row.style.backgroundColor = 'transparent');
                el.querySelectorAll('table').forEach(table => {
                    table.style.cssText = `
                        margin-top: 20px;
                        border-collapse: separate;
                        border-spacing: 0px;
                    `
                });
                el.querySelectorAll('td, th').forEach(cell => {
                    cell.style.cssText = `
                        padding: 4px;
                        border: 1px solid black;
                        font-size: 8px;
                        min-width: 80px;
                        max-width: 95px;
                        overflow: hidden;
                    `
                })
            },
            scale: 0.3,
        },
        callback: (doc) => {
        doc.save('Lista.pdf');
    }});

    printer.print('Lista.pdf');
}

const randomColor = () => {
    const h = Math.floor(Math.random() * 360),
          s = Math.floor(Math.random() * 100) + '%',
          l = Math.floor(Math.random() * 70) + '%';

    return `hsl(${h},${s},${l})`;
}

const showContextMenu = (event, row) => {
    changeContextElement();
    showItem(ctxMenu, true);
    ctxMenu.style.left = `${(event.pageX - 10)}px`;
    ctxMenu.style.top = `${(event.pageY - 10)}px`;

    let rowClass = event.target.parentNode.className;

    document.querySelectorAll('#openEdit, #openDel, #tags').forEach(item => {
        if (!row || rowClass != row.className) showItem(item, false); else showItem(item, true);
        if (item.id == 'tags' && currentTable.id != 'rooms') showItem(item, false);
    });

    if (selectedElement && currentTable.id == 'rooms') checkTags();
};

const showCustomerLineTitle = (event, values) => {
    CLT.style.left = `${(event.pageX - 50)}px`;
    CLT.style.top = `${(event.pageY - 30)}px`;

    const keys = ['Nome', 'Cognome', 'Data Inzio', 'Data Fine', 'Località', 'Servizi', 'Totale'],
        objects = getListValues(values);

    objects.forEach(object => {
        CLT.insertAdjacentHTML('beforeend', `<h2>Cliente ${objects.indexOf(object) + 1}</h2>`);
        for (i=0; i<object.length; i++) {
            CLT.insertAdjacentHTML('beforeend', `${keys[i]}: ${object[i]}</br>`);
        }
    })

    showItem(CLT, true);
}

const showItem = (item, bool) => {
    if (bool) item.style.display = 'block'; else item.style.display = 'none';
};

const showTable = tableId => {
    const table = document.querySelector(`#${tableId}`);

    if (currentTable) {
        currentTable.style.opacity = '0';
        currentTable.style.pointerEvents = 'none';
    };

    table.style.opacity = '1';
    table.style.pointerEvents = 'auto';
    currentTable = table;

    document.body.style.height = `${currentTable.childNodes.length * 100}px`;
};

const showWindow = (button, winId) => {
    switch (button.id) {
        case 'openDel':
            winId = 'confirmWindow';
            break;
        case 'openPrint':
            winId = 'printWindow';
            break;
        case 'openDB':
            winId = 'dbWindow';
            break;
        default:
            winId = `${currentTable.id.slice(0, -1)}Window`;
    } 

    document.querySelectorAll(`#windowLevel, #${winId}`).forEach(item => {
        showItem(item, true);
        currentWindow = item;
    });

    currentWindow.operation = button.id.slice(4).toLowerCase();
    changePlaceholders();
};

// Calendar
const days = document.querySelector('#days'),
    monthsItalian = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 
    'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const moveCalendar = (direction) => {
    usedMonth += direction;
  
    if (direction == 1 && usedMonth == 12) {usedMonth = 0; usedYear += 1;} 
    else if (direction == -1 && usedMonth == -1) {usedMonth = 11; usedYear -= 1;};

    const usedMonthIT = monthsItalian[usedMonth],
        daysInMonth = new Date(usedYear, usedMonth + 1, 0).getDate();
    
    document.querySelector('#month-year').innerHTML = `${usedMonthIT.toUpperCase()} ${usedYear}`;
    
    days.innerHTML = '';
    for (let i=0; i < daysInMonth; i++) {
      let day = document.createElement('li');
      day.innerHTML = i + 1;
      day.className = 'day';
      day.style.width = `${100/daysInMonth}%`;
      days.append(day);
    };
 
    displayCustomerLines(100/daysInMonth);
};

// Buttons and Windows 
document.querySelectorAll('.listButton').forEach(button => {
    if (button.id == 'openPrint') return;
    const listId = button.id.slice(4).toLowerCase();
    button.onclick = () => showTable(listId);
});

document.querySelectorAll('.changeMonth').forEach(arrow => {
    arrow.onclick = () => {
       if (arrow.id == 'nextMonth') {moveCalendar(1)} else {moveCalendar(-1)};
    }
});

document.querySelectorAll('.winBtn').forEach(winBtn => {
    winBtn.onclick = () => {
        showWindow(winBtn);

        const btnValue = winBtn.innerHTML.slice(winBtn.innerHTML.indexOf('</i>') + 4);

        document.querySelectorAll('.operationButton').forEach(opBtn => {
            if (opBtn.id != 'confirmYes') opBtn.value = btnValue;
        })
    };
});

document.querySelectorAll('.operationButton').forEach(button => {
    button.onclick = () => {
        eval(`new Element().${currentWindow.operation}()`);
    }
});

// DB
const updateDB = () => {
    const newDir = document.querySelector("#dbDir").value;
    if (newDir.length > 0) {
        fs.writeFileSync(DYNAMIC_DB, newDir);
        alert("DB cambiato con successo!");
    }
    else alert("Nessun nuovo valore specificato.");

    location.reload();
}

document.querySelector("#dbButton").onclick = () => updateDB();

document.querySelector("#folderOpen").onclick = () => ipcRenderer.send('open-file-dialog');
ipcRenderer.on('selected-file', (_, path) => document.querySelector("#dbDir").value = path);

document.querySelector("#backupDB").onclick = () => {
    const data = fs.readFileSync(dbDir, { encoding: 'utf-8', flag: 'r'});
    fs.writeFileSync(BACKUP_DIR, data);
    alert(`Backup creato con successo in ${BACKUP_DIR}`);
    location.reload(); 
}

// Window
window.onclick = (event) => {
    showItem(ctxMenu, false);
    hideWindow(event);
};

window.onload = () => {
    document.querySelector("#dbDir").placeholder = `Corrente: ${dbDir}`;
    checkElementIds();
    deleteOldCustomers();
    ['rooms', 'customers', 'services'].forEach(item => listElements(item));
    buildPrintList();
    listProvinces();

    const ListItems = {
        0: [roomsList, document.forms.newCustomer.roomName, 'option', 'value'],
        1: [servicesList, document.querySelector('#servicesList'), 'input', 'value'],
        2: [tagsList, document.querySelector('#tagsList'), 'menu', 'id']
    },
    lists = getListValues(ListItems);
    lists.forEach(list => displayListItems(list));

    showTable('rooms');
    moveCalendar(0);
};