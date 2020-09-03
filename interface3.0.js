const low = require('lowdb'),
    FileSync = require('lowdb/adapters/FileSync'),
    adapter = new FileSync('data.json'),
    db = low(adapter),
    roomsList = db.get('Rooms'),
    customersList = db.get('Customers'),
    servicesList = db.get('Services'),
    tagsList = db.get('Tags'),
    CLT = document.querySelector('#customerLineTitle'),
    ctxMenu = document.querySelector('#ctxMenu');

let selectedElement, currentTable, currentWindow;

db.defaults({ Rooms: [], Customers: [], Services: [], Tags: [] }).write();

class Element {
    constructor(){
        this.currentList = eval(`${currentTable.id}List`);
        this.form = document.forms[`new${capitalize(currentTable.id.slice(0, -1))}`];
    }

    add() {
        const values = {id: ''};

        if (isFormEmpty(this.form)) {alert('Per favore compilare tutti i campi.'); return};

        for (const [key, object] of Object.entries(this.form)) {
            if (object.name != '') values[object.name] = object.value;
        }

        switch (this.currentList) {
            case roomsList:
                values.tags = [];
                break;
            case customersList:
                values.services = [];
                document.querySelectorAll('input[name=services]').forEach(checkbox => {
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
        let list = {};

        Object.entries(this.form).forEach(([key, object]) => {
            if (object.name && object.value) list[object.name] = object.value;
        });
        
        this.currentList.find({id: selectedElement.id}).assign(list).write();
    };

    del() {
        this.currentList.remove({id: selectedElement.id}).write();
    };
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
        values = getRoomsAndCustomers();

    Object.entries(values).forEach(([key, value]) => {
        const row = document.createElement('tbody'),
            id = row.id = `pR${key}`;
            roomValues = value[0],
            customerNum = (value.length - 1) / 4 + 1;
            
        if (roomValues[2] == '') roomValues[2] = `<input type='text' class='noteBox'/>`;
        row.insertAdjacentHTML('beforeend', 
        `<tr>
            <td rowspan='${customerNum}'>
                ${roomValues.join(`</td><td rowspan='${customerNum}'>`)}
            </td>
        </tr>`);

        table.append(row);
        
        for (i=0; i<customerNum - 1; i++) {
            const elements = value.slice(1 + i * 4, 5 + i * 4),
                target = document.querySelector(`#${id}`);

            target.insertAdjacentHTML('beforeend', `<tr><td>${elements.join('</td><td>')}</td></tr>`)
        }
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
            Object.entries(form).forEach(([key, object]) => {object.placeholder = ''; object.value = '';});
            break;

        case 'edit':
            let values = getListValues(selectedElement, 'id');
    
            for (i=0; i<values.length-1; i++) {
                const el = Object.entries(form)[i][1];
                if (el.nodeName == 'INPUT') {
                    if (el.type == 'date') el.value = values[i];
                    else el.placeholder = values[i];
                };

                if (formName == 'newCustomer') {
                    document.querySelectorAll('input[name=services]').forEach(checkbox => {
                        if (values[i].includes(checkbox.value)) checkbox.checked = true;
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

const displayCustomerLines = (month, year, percentage) => {
    customersList.forEach(customer => {
        document.querySelectorAll('.roomsRow').forEach(row => {
            const roomName = row.childNodes[0].innerHTML,
                roomLine = row.childNodes[1].childNodes[0],
                sD = new Date(customer.startDate),
                eD = new Date(customer.endDate),
                values = {0: getListValues(customer, 'id', 'roomName')},
                busyCustomers = isDateBusy(customer),
                randomColor = '#'+Math.random().toString(16).substr(-6);

            
            if (busyCustomers.length > 0) {
                for (i=0; i<busyCustomers.length; i++) {
                    values[i + 1] = getListValues(busyCustomers[i], 'id', 'roomName');
                }
            };
            
            if (roomName == customer.roomName) {
                if (isInMonth(month, year, sD, eD)) {
                    let customerLine = document.createElement('div');

                    if (eD.getMonth() > sD.getMonth()) continueCustomerLine(sD, eD);

                    let left = percentage * (sD.getDate() * 0.77) + 7.74,
                        width = percentage * (eD.getDate() - sD.getDate()) * 0.79,
                        lastDay = new Date(eD.getFullYear(), eD.getMonth() + 1, 0).getDate();

                    if ((eD.getDate() - sD.getDate()) < 10) width += 2.5;
                    if (eD.getDate() == lastDay && (eD.getDate() - sD.getDate()) < 5) width -= 0.9;

                    customerLine.className = 'customerLine';
                    customerLine.style.backgroundColor = randomColor;
                    customerLine.style.width = `${width}%`;
                    customerLine.style.left = `${left}%`;
                    roomLine.append(customerLine);

                    customerLine.onmouseover = (event) => showCustomerLineTitle(event, values);
                    CLT.onmouseout = () => { showItem(CLT, false); CLT.innerHTML = ''; };
                } else roomLine.innerHTML = '';
            }
        });
    }).value().sort((a, b) => b.startDate.localeCompare(a.startDate));
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

const getRoomsAndCustomers = () => {
    const values = {};

    roomsList.forEach(room => {
        const roomValues = getListValues(room, 'id'),
            position = roomsList.indexOf(room);

        values[position] = [roomValues];

        customersList.forEach(customer => {
            if (room.name == customer.roomName) {
                const customerValues = getListValues(customer, 'id', 'roomName', 'surname', 'total');
                
                customerValues.forEach(value => {
                    values[position].push(value);
                });
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
        const sD2 = new Date(c.startDate).getTime(),
            eD2 = new Date(c.endDate).getTime();

        if (c != customer && c.roomName == customer.roomName 
            && ((sD >= sD2 && sD <= eD2) || (sD2 >= sD && eD2 <= eD))) {
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

const isInMonth = (month, year, ...dates) => {
    let result = false;
    dates.forEach(date => {
        if (date.getMonth() == month && date.getFullYear() == year) {result = true; return}
    })

    return result;
};

const listElements = (tableId) => {
    const table = document.querySelector(`#${tableId}`),
        rowClass = `${tableId}Row`,
        list = eval(`${tableId}List`);

    list.forEach(item => {
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
                values[5] = values[5].join(', ');
                break;
        }

        table.insertAdjacentHTML('beforeend',
        `<tr class='${rowClass}' id='${position}'><td>${values.join('</td><td>')}</td></tr>`);
    }).value().sort((a, b) => a.name.localeCompare(b.name));

    const rows = document.querySelectorAll(`.${rowClass}`);

    if (rows.length == 0) table.oncontextmenu = event => showContextMenu(event, undefined);
    else {
        rows.forEach(row => {        
            table.oncontextmenu = event => showContextMenu(event, row);
            row.oncontextmenu = () => {
                selectedElement = list.write()[row.id];
            };

            if (list == roomsList) {
                addClassesToChildren(row, 'roomName', '', 'roomType');
                displayTags(row);
            };
        });
    }
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
                el.name = 'services',
                label = document.createElement('label');
                label.innerHTML = label.htmlFor = el.value;
                break;
        }

        target.append(el);
        if (label) target.append(label);
    }).value();
};

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

    const keys = ['Nome', 'Cognome', 'Data Inzio', 'Data Fine', 'Servizi', 'Totale'],
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
};

const showWindow = (button, winId) => {
    switch (button.id) {
        case 'openDel':
            winId = 'confirmWindow';
            break;
        case 'openPrint':
            winId = 'printWindow';
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

// Calendar Shit
const today = new Date(),
    days = document.querySelector('#days'),
    monthsItalian = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

let usedMonth = today.getMonth(),
    usedYear = today.getFullYear();

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
 
    displayCustomerLines(usedMonth, usedYear, 100/daysInMonth);
};

const continueCustomerLine = (sD, eD) => {
    switch (usedMonth) {
        case sD.getMonth():
            eD.setDate(0); 
            sD.setDate(sD.getDate());
            break;
        case eD.getMonth():
            sD.setDate(1); 
            eD.setDate(eD.getDate());
            break;
    }
}

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

        location.reload();
        return false;
    }
});

window.onclick = (event) => {
    showItem(ctxMenu, false);
    hideWindow(event);
};

window.onload = () => {
    checkElementIds();
    ['rooms', 'customers', 'services'].forEach(item => listElements(item));
    buildPrintList();

    const ListItems = {
        0: [roomsList, document.forms.newCustomer.roomName, 'option', 'value'],
        1: [servicesList, document.querySelector('#customerWindow'), 'input', 'value'],
        2: [tagsList, document.querySelector('#tagsList'), 'menu', 'id'],
    },
    lists = getListValues(ListItems);
    lists.forEach(list => displayListItems(list));

    showTable('rooms');
    moveCalendar(0);
};