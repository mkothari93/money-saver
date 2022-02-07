// create variable to hold db connection
let db;

// connect to IndexedDB database called 'budget_tracker' and set it to version 1
const request = indexedDB.open('budget_tracker', 1);

// this event will emit if the database version changes
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;

  // create an object store called `new_sale`
  db.createObjectStore('new_sale', { autoIncrement: true });
};

request.onsuccess = function (event) {
  // when db is successfully created, save reference to db in global variable
  db = event.target.result;

  // check if app is online, then run uploadSale() to send all local db data to api
  if (navigator.onLine) {
    uploadSale();
  }
};

request.onerror = function (event) {
  console.log(event.target.errorCode);
};

// executed if we attempt to submit a new sale and there's no internet connection
function saveRecord(record) {
  // open a new sale with the database with read and write permissions
  const transaction = db.transaction(['new_sale'], 'readwrite');

  // access the object store for `new_sale`
  const saleObjectStore = transaction.objectStore('new_sale');

  // add record to store with add method
  saleObjectStore.add(record);
}

function uploadSale() {
  // open a transaction on db
  const transaction = db.transaction(['new_sale'], 'readwrite');

  // access object store
  const saleObjectStore = transaction.objectStore('new_sale');

  // get all records from store and set to a variable
  const getAll = saleObjectStore.getAll();

  // upon a successful .getAll() execution, run this function
  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['new_sale'], 'readwrite');
          // access the new_sale object store
          const saleObjectStore = transaction.objectStore('new_sale');
          // clear all items in store
          saleObjectStore.clear();

          alert('All offline transaction has been submitted!');
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener('online', uploadSale);