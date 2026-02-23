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
function _error_log(message) {
    const manualError = {
        action: "error_log",
        _message: message
    };

    tg.sendData(JSON.stringify(manualError));
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
    } catch (error) {
        _error_log(error)

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



// Middlewares
function validate() {
    const address = addressInput.value.trim();
    const bottles = parseInt(bottlesInput.value) || 0;
    const isPrivate = privateHouseCheckbox.checked;

    if (!address || address.length < 5) {
        tg.showAlert("Пожалуйста, укажите верный адрес.");
        return false;
    }

    if (bottles <= 0 || bottles >= 10) {
        tg.showAlert("Пожалуйста, укажите количество бутылей от 1 до 50. Для оптового заказа - обратитесь к нашему оператору.");
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
        const data = {
            action: "order",
            street: addressInput.value.trim(),
            entrance: isPrivate ? "1" : entranceInput.value,
            floor: isPrivate ? "1" : floorInput.value,
            apartment: isPrivate ? "1" : apartmentInput.value,
            bottles: bottlesInput.value,
            comment: commentInput.value.trim()
        };

        tg.sendData(JSON.stringify(data));
        tg.close();
    } catch (e) {
        _error_log(e);
    }
});

document.addEventListener("click", (e) => {
    if (e.target !== addressInput) {
        suggestionsBox.style.display = "none";
    }
})