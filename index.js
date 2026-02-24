// Setuping TG WebApp
const tg = window.Telegram.WebApp;
tg.expand();



// Params and DOM
const BBOX = "69.3300,53.2500~69.4500,53.3300";
let debounceTimer;

const addressInput = document.getElementById("address");
const suggestionsBox = document.getElementById("suggestions");
const privateHouseCheckbox = document.getElementById("private_house");
const entranceInput = document.getElementById("entrance");
const floorInput = document.getElementById("floor");
const apartmentInput = document.getElementById("apartment");
const bottlesInput = document.getElementById("bottles");
const dateInput = document.getElementById("delivery_date");
const noDateBox = document.getElementById("nodate");
const handleBottleCheckbox = document.getElementById("handle_bottle");
const commentInput = document.getElementById("comment");
const orderBtn = document.getElementById("order_btn");


// Error interceptor
window.onerror = function(message, source, lineno, colno) {
    const errorDetails = {
        action: "error",
        _message: message,
        _line: lineno,
        _column: colno,
        _source: source ? source.split('/').pop() : "unknown"
    };

    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.sendData(JSON.stringify(errorDetails));
        window.Telegram.WebApp.close();
    }
    return true;
};
function _Error(type, origin, error) {
    const warning = {
        action: type,
        _origin: origin,
        _error: error
    };

    tg.sendData(JSON.stringify(warning));
}



// Targeted events
addressInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = addressInput.value.trim();

    if (query.length < 2) {
        suggestionsBox.innerHTML = "";
        suggestionsBox.style.display = "none";
        return;
    }

    debounceTimer = setTimeout(() => {
        fetchSuggestions(query);
    }, 200);
});
async function fetchSuggestions(query) {
    try {
        const url = `https://suggest-maps.yandex.ru/v1/suggest?apikey=a3fbaf22-d694-4200-98ed-6c3075db0c34&text=${encodeURIComponent(query)}&lang=ru_RU&types=geo&bbox=${BBOX}&strict_bounds=1`;

        const response = await fetch(url);

        if (!response.ok) {
            suggestionsBox.style.display = "none";
            return;
        }

        const data = await response.json();

        renderSuggestions(data.results || []);
    } catch (e) {
        _Error("warn", "F: fetchSuggestions", e)

        suggestionsBox.style.display = "none";
    }
}
function renderSuggestions(results) {
    suggestionsBox.innerHTML = "";

    suggestionsBox.style.display = "block";
    results.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = item.title.text;

        div.onclick = () => {
            addressInput.value = item.title.text;
            suggestionsBox.innerHTML = "";
            suggestionsBox.style.display = "none";
        };

        suggestionsBox.appendChild(div);
    });
}

privateHouseCheckbox.addEventListener("change", () => {
    const displayStyle = privateHouseCheckbox.checked ? "none" : "grid";

    const apartmentFields = document.getElementById("apartment_fields");
    if (apartmentFields) {
        apartmentFields.style.display = displayStyle;
    }

    if (privateHouseCheckbox.checked) {
        entranceInput.value = "";
        floorInput.value = "";
        apartmentInput.value = "";
    }
});

function initDatePicker() {
    const now = new Date();
    let minDate = new Date();

    if (now.getHours() >= 12) {
        minDate.setDate(now.getDate() + 1);

        noDateBox.style.display = "block";
    }

    const maxDate = new Date();
    maxDate.setDate(minDate.getDate() + 7);

    dateInput.min = formatDate(minDate);
    dateInput.max = formatDate(maxDate);
    dateInput.value = formatDate(minDate);
}
initDatePicker()

// Middlewares
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function validate() {
    const address = addressInput.value.trim();
    const bottles = parseInt(bottlesInput.value) || 0;
    const selectedDate = new Date(dateInput.value);
    const minAllowed = new Date(dateInput.min);
    const maxAllowed = new Date(dateInput.max);

    const isPrivate = privateHouseCheckbox.checked;

    if (!address || address.length < 5) {
        tg.showAlert("Пожалуйста, укажите верный адрес.");
        return false;
    }

    if (bottles <= 0 || bottles >= 10) {
        tg.showAlert("Пожалуйста, укажите количество бутылей от 1 до 50. Для оптового заказа - обратитесь к нашему оператору.");
        return false;
    }

    if (!dateInput.value || selectedDate < minAllowed || selectedDate > maxAllowed) {
        tg.showAlert("Выберите корректную дату доставки (не более недели вперед).");
        return false;
    }

    if (!isPrivate) {
        const ent = entranceInput.value.trim();
        const fl = floorInput.value.trim();
        const ap = apartmentInput.value.trim();

        if (!ent || !fl || !ap) {
            tg.showAlert("Пожалуйста, укажите данные адреса доставки.");
            return false;
        }

        if (ent.length > 2 || fl.length > 2) {
            tg.showAlert("Пожалуйста, укажите корректные адреса доставки.");
            return false;
        }
    }

    return true;
}

orderBtn.addEventListener("click", () => {
    try {
        if (!validate()) return;

        const isPrivate = privateHouseCheckbox.checked;
        const isWithHandle = handleBottleCheckbox.checked
        let comment = "";

        if (isPrivate){
            comment += "[Частный дом. "
        }

        if (isWithHandle){
            comment += "Бутыль с ручкой."
        }

        comment += `] ${commentInput.value.trim()}`
        const data = {
            action: "order",
            _amount: bottlesInput.value,
            _street: addressInput.value.trim(),
            _apartment: isPrivate ? "" : apartmentInput.value,
            _entrance: isPrivate ? "" : entranceInput.value,
            _floor: isPrivate ? "" : floorInput.value,
            _date: dateInput.value,
            _comment: comment
        };

        tg.sendData(JSON.stringify(data));
        tg.close();
    } catch (e) {
        _Error("error", "", e);
    }
});

document.addEventListener("click", (e) => {
    if (e.target !== addressInput) {
        suggestionsBox.style.display = "none";
    }
})