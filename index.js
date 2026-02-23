const tg = window.Telegram.WebApp;

if (!tg || !tg.initData) {
    console.error("Telegram WebApp undefined");
    handleTechnicalError();
}

tg.expand();

const BBOX = "69.3300,53.2500~69.4500,53.3300";

const addressInput = document.getElementById("address");
const suggestionsBox = document.getElementById("suggestions");
const privateHouseCheckbox = document.getElementById("private_house");
const entranceInput = document.getElementById("entrance");
const floorInput = document.getElementById("floor");
const apartmentInput = document.getElementById("apartment");
const bottlesInput = document.getElementById("bottles");
const commentInput = document.getElementById("comment");
const orderBtn = document.getElementById("order_btn");

let debounceTimer;

window.onerror = function() {
    handleTechnicalError();
};

function handleTechnicalError() {
    if (tg && typeof tg.sendData === 'function') {
        tg.sendData(JSON.stringify({ action: "error", message: "technical_fault" }));
        tg.close();
    }
}

addressInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = addressInput.value.trim();

    if (query.length < 3) {
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
        console.error("API offline, allowing manual input");
        suggestionsBox.style.display = "none";
    }
}

function renderSuggestions(results) {
    suggestionsBox.innerHTML = "";

    if (results.length === 0) {
        suggestionsBox.style.display = "block";
        const errorDiv = document.createElement("div");
        errorDiv.className = "suggestion-error";
        errorDiv.innerHTML = `<small style="color: #666;">Ваш адрес вне нашего реестра. Рекомендуем обратиться к оператору.</small>`;
        suggestionsBox.appendChild(errorDiv);
        return;
    }

    suggestionsBox.style.display = "block";
    results.forEach(item => {
        const div = document.createElement("div");
        div.className = "suggestion-item";
        div.textContent = item.title.text;

        div.onclick = () => {
            addressInput.value = item.title.text;
            suggestionsBox.innerHTML = "";
            suggestionsBox.style.display = "none";
            if (!privateHouseCheckbox.checked) entranceInput.focus();
        };

        suggestionsBox.appendChild(div);
    });
}

function validate() {
    const address = addressInput.value.trim();
    const bottles = parseInt(bottlesInput.value) || 0;

    if (!address || address.length < 5) {
        tg.showAlert("Укажите корректный адрес.");
        return false;
    }

    if (bottles <= 0) {
        tg.showAlert("Укажите количество бутылок.");
        return false;
    }

    if (!privateHouseCheckbox.checked) {
        const ent = entranceInput.value.trim();
        const fl = floorInput.value.trim();
        const ap = apartmentInput.value.trim();

        if (!ent || !fl || !ap) {
            tg.showAlert("Заполните подъезд, этаж и квартиру.");
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
            entrance: isPrivate ? "Частный дом" : entranceInput.value,
            floor: isPrivate ? "1" : floorInput.value,
            apartment: isPrivate ? "-" : apartmentInput.value,
            bottles: bottlesInput.value,
            comment: commentInput.value.trim()
        };

        tg.sendData(JSON.stringify(data));
        tg.close();
    } catch (e) {
        handleTechnicalError();
    }
});

document.addEventListener("click", (e) => {
    if (e.target !== addressInput) {
        suggestionsBox.style.display = "none";
    }
});