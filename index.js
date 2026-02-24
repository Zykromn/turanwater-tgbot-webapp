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
function autoFill() {
    const exId = urlParams.get('ex_article');
    const exPrice = urlParams.get('ex_price');
    const puId = urlParams.get('pu_article');
    const puPrice = urlParams.get('pu_price');

    // 2. Заполняем объект артикулов
    if (exId && exPrice) articles[exId] = parseInt(exPrice);
    if (puId && puPrice) articles[puId] = parseInt(puPrice);

    // 3. Привязываем ID к кнопкам динамически
    const btnEx = document.getElementById("btn_exchange");
    const btnPu = document.getElementById("btn_purchase");

    if (btnEx) btnEx.dataset.id = exId;
    if (btnPu) btnPu.dataset.id = puId;

    selectedProductId = exId;

    if (urlParams.get('phone')) phoneInput.value = urlParams.get('phone');

    if (urlParams.get('addr')) addressInput.value = decodeURIComponent(urlParams.get('addr'));
    if (urlParams.get('apt')) apartmentInput.value = urlParams.get('apt');
    if (urlParams.get('ent')) entranceInput.value = urlParams.get('ent');
    if (urlParams.get('fl')) floorInput.value = urlParams.get('fl');

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
        tg.showAlert("Введите корректный номер телефона.");
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

    const data = {
        action: "order",
        _amount: bottlesInput.value,
        _street: addressInput.value.trim(),
        _phone: phoneInput.value.trim(),
        _apartment: isPrivate ? "" : apartmentInput.value,
        _entrance: isPrivate ? "" : entranceInput.value,
        _floor: isPrivate ? "" : floorInput.value,
        _date: dateInput.value,
        _productId: selectedProductId,
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