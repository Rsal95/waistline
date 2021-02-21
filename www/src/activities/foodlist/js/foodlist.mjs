/*
  Copyright 2020, 2021 David Healey

  This file is part of Waistline.

  Waistline is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Waistline is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with Waistline.  If not, see <http://www.gnu.org/licenses/>.
*/

import * as Tests from "./tests.js";
import * as Utils from "/www/assets/js/utils.js";
import * as Off from "./open-food-facts.js";
import * as USDA from "./usda.js";
import * as Editor from "/www/src/activities/foods-meals-recipes/js/food-editor.js";

import {
  renderItem
} from "/www/src/activities/foods-meals-recipes/foods-meals-recipes.mjs";

var s;
waistline.Foodlist = {

  settings: {
    list: [], //Main list of foods
    filterList: [], //Copy of the list for filtering
    el: {} //UI elements
  },

  init: async function(context) {
    s = this.settings; //Assign settings object
    s.selection = []; //Clear out selection when page is reloaded

    if (context) {

      if (context.item) {
        if (context.item.id)
          await this.updateItem(context.item);
        else
          await this.addItem(context.item);
      }
    }

    this.getComponents();
    this.createSearchBar();
    this.bindUIActions();

    if (!s.ready) {
      f7.infiniteScroll.create(s.el.infinite); //Setup infinite list
      s.ready = true;
    }

    s.list = await this.getListFromDB();
    s.filterList = s.list;

    // Set scan button visibility
    if (waistline.Settings.get("integration", "off") == true)
      s.el.scan.style.display = "block";
    else
      s.el.scan.style.display = "none";

    this.renderList(true);
  },

  getComponents: function() {
    s.el.title = document.querySelector(".page[data-name='foods-meals-recipes'] #title");
    s.el.scan = document.querySelector(".page[data-name='foods-meals-recipes'] #scan");
    s.el.search = document.querySelector("#foods-tab #food-search");
    s.el.searchForm = document.querySelector("#foods-tab #food-search-form");
    s.el.infinite = document.querySelector(".page[data-name='foods-meals-recipes'] #foodlist"); //Infinite list container
    s.el.list = document.querySelector(".page[data-name='foods-meals-recipes'] #foodlist ul"); //Infinite list
    s.el.spinner = document.querySelector("#foods-tab #spinner");
  },

  bindUIActions: function() {

    //Infinite list 
    s.el.infinite.addEventListener("infinite", (e) => {
      this.renderList();
    });

    //Search form 
    s.el.searchForm.addEventListener("submit", (e) => {
      this.search(s.el.search.value);
    });

    if (!s.el.scan.hasClickEvent) {
      s.el.scan.addEventListener("click", async (e) => {
        let item = await this.scan();
        if (item !== undefined) {
          waistline.FoodsMealsRecipes.gotoEditor(item);
        }
      });
      s.el.scan.hasClickEvent = true;
    }
  },

  search: async function(query) {
    if (query != "") {
      s.el.spinner.style.display = "block";
      let offList = [];
      let usdaList = [];

      let offEnabled = waistline.Settings.get("integration", "off");
      let usdaEnabled = waistline.Settings.get("integration", "usda") && (waistline.Settings.get("integration", "usda-key") != "");

      if (offEnabled == true || usdaEnabled == true) {

        if (offEnabled)
          offList = await Off.search(query);

        if (usdaEnabled)
          usdaList = await USDA.search(query);

        let result = offList.concat(usdaList);

        if (result.length > 0) {
          s.list = result;
          s.filterList = s.list;
        } else {
          Utils.toast("No results");
        }
      } else {
        Utils.toast("No search providers are enabled", 2000);
      }
    }

    s.el.spinner.style.display = "none";

    this.renderList(true);
  },

  renderList: async function(clear) {

    if (clear) Utils.deleteChildNodes(s.el.list);

    //List settings 
    let maxItems = 300; //Max items to load
    let itemsPerLoad = 20; //Number of items to append at a time
    let lastIndex = document.querySelectorAll(".page[data-name='foods-meals-recipes'] #foodlist-container li").length;

    if (lastIndex <= s.list.length) {
      //Render next set of items to list
      for (let i = lastIndex; i <= lastIndex + itemsPerLoad; i++) {
        if (i >= s.list.length) break; //Exit after all items in list
        let item = s.list[i];
        item.type = "food";

        if (!item.archived)
          renderItem(item, s.el.list, true, undefined, this.removeItem);
      }
    }
  },

  getListFromDB: function() {
    return new Promise(async function(resolve, reject) {
      let sort = waistline.Settings.get("foodlist", "sort");
      let result = await waistline.FoodsMealsRecipes.getFromDB("foodList", sort);
      resolve(result);
    }).catch(err => {
      throw (err);
    });
  },

  addItem: function(item) {
    return new Promise(function(resolve, reject) {
      dbHandler.put(item, "foodList").onsuccess = (e) => {
        resolve(e.target.result);
      };
    }).catch(err => {
      throw (err);
    });
  },

  updateItem: function(item) {
    return new Promise(function(resolve, reject) {
      let now = new Date();

      item.dateTime = now;

      dbHandler.put(item, "foodList").onsuccess = function() {
        resolve();
      };
    }).catch(err => {
      throw (err);
    });
  },

  updateItems: function(items) {
    items.forEach((x) => {
      this.updateItem(x);
    });
  },

  updateDateTimes: async function(itemIds) {
    let items = [];

    itemIds.forEach(async (x) => {
      let item = await dbHandler.getItem(x, "foodList");
      item.dateTime = new Date();
      items.push(item);
    });

    await dbHandler.bulkInsert(items, "foodList");
  },

  removeItem: function(item) {
    return new Promise(function(resolve, reject) {

      let title = waistline.strings["confirm-delete-title"] || "Delete";
      let msg = waistline.strings["confirm-delete"] || "Are you sure?";

      let dialog = f7.dialog.confirm(msg, title, async () => {
        await waistline.FoodsMealsRecipes.removeItem(item.id, "food");
        s.list = [];
        f7.views.main.router.refreshPage();
      });
    }).catch(err => {
      throw (err);
    });
  },

  createSearchBar: function() {
    const searchBar = f7.searchbar.create({
      el: s.el.searchForm,
      backdrop: false,
      customSearch: true,
      on: {
        async search(sb, query, previousQuery) {
          if (query != "") {
            s.list = waistline.FoodsMealsRecipes.filterList(query, s.filterList);
            waistline.Foodlist.renderList(true);
          } else {
            waistline.FoodsMealsRecipes.clearSearchSelection();
            s.list = await waistline.Foodlist.getListFromDB();
            s.filterList = s.list;
            s.el.spinner.style.display = "none";
            f7.searchbar.disable(this);
          }
          waistline.Foodlist.renderList(true);
        },
      }
    });
  },

  searchByBarcode: function(code) {
    return new Promise(function(resolve, reject) {
      dbHandler.getIndex("barcode", "foodList").get(code).onsuccess = (e) => {
        resolve(e.target.result);
      };
    }).catch(err => {
      throw (err);
    });
  },

  submitButtonAction: async function(selection) {
    let data = await this.getItemsFromSelection(selection);
    this.updateDateTimes(data.ids);
    waistline.FoodsMealsRecipes.returnItems(data.items);
  },

  getItemsFromSelection: function(selection) {
    return new Promise(async function(resolve, reject) {

      let result = {
        items: [],
        ids: []
      };

      for (let i = 0; i < selection.length; i++) {

        let data = JSON.parse(selection[i]);

        if (data.id == undefined) { //No ID, must be a search result 

          if (data.barcode) { //If item has barcode it must be from online service

            //Check to see if item is already in DB 
            let dbData = await waistline.Foodlist.searchByBarcode(data.barcode);

            //If item is in DB use retrieved data, otherwise add item to DB and get new ID
            if (dbData) {
              data = dbData;

              // Unarchive the food if it has been archived
              if (data.archived == true) {
                data.archived = false;
                await waistline.Foodlist.updateItem(data);
              }
            }
          }

          // Doesn't have barcode or could not be found with barcode search
          if (data.id == undefined)
            data.id = await waistline.Foodlist.addItem(data);
        }

        let item = {
          id: data.id,
          portion: data.portion,
          unit: data.unit,
          type: data.type,
        };

        result.items.push(item);
        result.ids.push(item.id);
      }

      resolve(result);
    });
  },

  gotoEditor: function(item) {
    f7.views.main.router.navigate("./food-editor/", {
      "context": {
        item: item,
        origin: "foodlist"
      }
    });
  },

  getQuickAddItem: function() {
    return new Promise(async function(resolve, reject) {
      let item = await dbHandler.get("foodList", "barcode", "quick-add");

      let result = {
        id: item.id,
        portion: item.portion,
        type: "food"
      };

      resolve(result);
    });
  },

  createQuickAddItem: async function() {
    let item = await dbHandler.get("foodList", "barcode", "quick-add");

    if (item == undefined) {
      item = {
        name: "Quick Add",
        barcode: "quick-add",
        "portion": 1,
        nutrition: {
          "calories": 1
        },
        archived: true
      };
      dbHandler.put(item, "foodList");
    }
  },

  scan: function() {
    return new Promise(function(resolve, reject) {
      cordova.plugins.barcodeScanner.scan(async (data) => {

        let code = data.text;

        if (code !== undefined) {
          // Check if the item is already in the foodlist
          let item = await dbHandler.get("foodList", "barcode", code);

          if (item === undefined) {

            // Not already in foodlist so search OFF 
            if (navigator.connection.type == "none") {
              Utils.notify(waistline.strings["no-internet"] || "No internet connection");
              reject();
            }

            // Display loading image
            s.el.spinner.style.display = "block";
            let result = await Off.search(code);

            // Return result from OFF
            if (result[0] !== undefined) {
              item = result[0];
            } else {
              waistline.Foodlist.gotoUploadEditor(code);
            }
          }
          resolve(item);
        } else {
          reject();
        }
      });
    });
  },

  gotoUploadEditor: function(code) {
    let title = waistline.strings["product-not-found"] || "Product not found";
    let text = waistline.strings["add-to-off"] || "Would you like to add this product to the Open Food Facts database?";

    let callbackOk = function() {
      f7.views.main.router.navigate("/foods-meals-recipes/food-editor/", {
        context: {
          origin: "foodlist",
          scan: true,
          item: undefined,
          barcode: code
        }
      });
    };

    let dialog = f7.dialog.confirm(text, title, callbackOk);
  }
};

document.addEventListener("tab:init", function(e) {
  if (e.target.id == "foodlist") {
    let context = f7.views.main.router.currentRoute.context;
    waistline.Foodlist.init(context);
    Tests.run();
  }
});