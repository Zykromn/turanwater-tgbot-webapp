// Setuping TG WebApp
const tg = window.Telegram.WebApp;
tg.expand();



// Params and DOM
const BBOX = "69.3300,53.2500~69.4500,53.3300";
let debounceTimer;

const urlParams = new URLSearchParams(window.location.search);
const phoneInput = document.getElementById("phone");
const addressInput = document.getElementById("address");
const suggestionsBox = document.getElementById("suggestions");
const privateHouseCheckbox = document.getElementById("private_house");
const entranceInput = document.getElementById("entrance");
const floorInput = document.getElementById("floor");
const apartmentInput = document.getElementById("apartment");
const bottlesInput = document.getElementById("bottles");
const totalPriceDisplay = document.getElementById("total_price");
const dateInput = document.getElementById("delivery_date");
const noDateBox = document.getElementById("nodate");
const commentInput = document.getElementById("comment");
const orderBtn = document.getElementById("order_btn");

let articles = {}
let selectedProductId;


// Error interceptor
window.onerror = function(message, source, lineno, colno) {
    const errorDetails = {
        action: "error",
        _message: message,
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
        _source: origin,
        _error: error
    };

    tg.sendData(JSON.stringify(warning));
}



// Targeted events
function autoFill() {
    const params = {
        exId: urlParams.get('ex_article'),
        exPrice: urlParams.get('ex_price'),
        puId: urlParams.get('pu_article'),
        puPrice: urlParams.get('pu_price'),
        phone: urlParams.get('phone'),
        addr: urlParams.get('addr'),
        apt: urlParams.get('apt'),
        ent: urlParams.get('ent'),
        fl: urlParams.get('fl')
    };

    const requiredParams =
        params.exId &&
        params.exPrice &&
        params.puId &&
        params.puPrice;

    if (!requiredParams) {
            document.body.innerHTML = `    
            <div class="no-tg">
                <h2>⚠️ Ошибка запуска</h2>
                <p> Пожалуйста, убедитель что вы открываете приложение через Telegram. </p>
            </div>
        `;
    }

    articles[params.exId] = parseInt(params.exPrice);
    articles[params.puId] = parseInt(params.puPrice);

    const btnEx = document.getElementById("btn_exchange");
    const btnPu = document.getElementById("btn_purchase");

    btnEx.dataset.id = params.exId;
    btnPu.dataset.id = params.puId;
    selectedProductId = params.exId;

    if (params.phone) {
        if (params.phone.startsWith("+7")) {
            phoneInput.value = params.phone.substring(2);
        } else if (params.phone.startsWith("7") || params.phone.startsWith("8")) {
            phoneInput.value = params.phone.substring(1);
        } else {
            phoneInput.value = ""
        }
    }

    if (params.addr) addressInput.value = decodeURIComponent(params.addr);
    if (params.apt) apartmentInput.value = params.apt;
    if (params.ent) entranceInput.value = params.ent;
    if (params.fl) floorInput.value = params.fl;

    updatePrice();
}

autoFill();

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

document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        selectedProductId = this.dataset.id;
        updatePrice();
    });
});
function updatePrice() {
    const count = parseInt(bottlesInput.value) || 0;
    const pricePerUnit = articles[selectedProductId] || 0;
    totalPriceDisplay.textContent = (count * pricePerUnit).toLocaleString();
}

bottlesInput.addEventListener('input', updatePrice);

function validate() {
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();
    const bottles = parseInt(bottlesInput.value) || 0;

    if (phone.length < 10) {
        tg.showAlert("Укажите верный номер телефона.");
        return false;
    }
    if (address.length < 4) {
        tg.showAlert("Укажите полный адрес.");
        return false;
    }
    if (bottles <= 0 || bottles > 10) {
        tg.showAlert("Укажите количество бутылей (1-50). Для оптового заказа обатитесь к оператору.");
        return false;
    }
    return true;
}

orderBtn.addEventListener("click", () => {
    if (!validate()) return;

    const isPrivate = privateHouseCheckbox.checked;

    let comment = ``;
    if (isPrivate) comment += "[Частный дом] ";
    comment += commentInput.value.trim();

    const phone = `7${phoneInput.value.trim()}`

    const data = {
        action: "order",
        _article: selectedProductId,
        _amount: bottlesInput.value,
        _phone: phone,
        _address: addressInput.value.trim(),
        _date: dateInput.value,
        _apartment: isPrivate ? "" : apartmentInput.value,
        _entrance: isPrivate ? "" : entranceInput.value,
        _floor: isPrivate ? "" : floorInput.value,
        _comment: comment
    };

    tg.sendData(JSON.stringify(data));
    tg.close();
});

document.addEventListener("click", (e) => {
    if (e.target !== addressInput) {
        suggestionsBox.style.display = "none";
    }
})