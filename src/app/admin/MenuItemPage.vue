<template>
  <div>
    <template v-if="notFound==null"></template>
    <template v-else-if="notFound">
      <not-found />
    </template>
    <template v-else>
      <section class="section">
        <back-button :url="`/admin/restaurants/${this.restaurantId()}/menus`" />

        <h2 class="p-big bold">{{$t("editMenu.item")}}</h2>
        <div class="media">
          <div class="media-content"></div>
          <div class="media-right">
            <p class="p-small bold" style="color:#CB4B4B">* {{$t("editMenu.required")}}</p>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-body">
            <h4>{{$t("editMenu.itemName")}}</h4>
            <p class="p-small" style="color:#CB4B4B">*</p>
          </div>
        </div>
        <b-field>
          <b-field :type="errors['itemName'].length > 0 ? 'is-danger' : 'is-success'">
            <b-input v-model="menuInfo.itemName" placeholder="Enter item name"></b-input>
          </b-field>
        </b-field>

        <div class="columns">
          <div class="column is-6">
            <div class="field is-horizontal">
              <div class="field-body">
                <h4>{{$t("editMenu.price")}}</h4>
                <p class="p-small" style="color:#CB4B4B">*</p>
              </div>
            </div>
            <div class="columns">
              <div class="column">
                <b-field :type="errors['price'].length > 0 ? 'is-danger' : 'is-success'">
                  <b-input
                    v-model="menuInfo.price"
                    type="number"
                    step="0.01"
                    placeholder="00.00"
                    max="10000.00"
                    min="0.00"
                  ></b-input>
                </b-field>
              </div>
              <div class="column">
                <h4>USD</h4>
              </div>
            </div>
          </div>
          <div class="column is-6">
            <div class="field is-horizontal">
              <div class="field-body">
                <h4>{{$t("editMenu.tax")}}</h4>
                <p class="p-small" style="color:#CB4B4B">*</p>
              </div>
            </div>
            <b-field :type="errors['tax'].length > 0 ? 'is-danger' : 'is-success'">
              <b-select v-model="menuInfo.tax" placeholder="select">
                <option
                  v-for="taxItem in taxRates"
                  :value="taxItem"
                >{{ taxItem }} {{ restaurantInfo && ((restaurantInfo[taxItem + "Tax"] || 0) + "%") }}</option>
              </b-select>
            </b-field>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-body">
            <h4>{{$t("editMenu.itemDescription")}}</h4>
          </div>
        </div>
        <b-field :type="errors['itemDescription'].length > 0 ? 'is-danger' : 'is-success'">
          <b-input v-model="menuInfo.itemDescription" placeholder="Enter item description"></b-input>
        </b-field>

        <div class="field is-horizontal">
          <div class="field-body">
            <h4>{{$t("editMenu.itemPhoto")}}</h4>
          </div>
        </div>

        <table style="margin-bottom:0.5rem">
          <tr>
            <td v-if="menuInfo.itemPhoto">Current</td>
            <td>New</td>
          </tr>
          <tr>
            <td v-if="menuInfo.itemPhoto">
              <img class="card_image" :src="this.menuInfo.itemPhoto" />
            </td>
            <td>
              <croppa
                v-model="croppa"
                :prevent-white-space="true"
                :zoom-speed="5"
                :placeholder="'Click and upload'"
                :placeholder-font-size="20"
                initial-position="center"
                :canvas-color="'gainsboro'"
              ></croppa>
            </td>
          </tr>
        </table>

        <div class="field is-horizontal">
          <div class="field-body">
            <h4>{{$t("editMenu.itemOptions")}}</h4>
          </div>
        </div>
        <p style="font-size:0.9em">{{$t('editMenu.itemOptionsNote')}}</p>
        <template v-for="(option, key) in menuInfo.itemOptionCheckbox">
          <div :style="{display: 'inline-flex', width: '100%'}" :key="key">
            <b-input
              v-model="menuInfo.itemOptionCheckbox[key]"
              placeholder="Enter item option"
              :style="{width: '95%'}"
            />
            <span @click="deleteOption(key)">
              <b-icon icon="delete" size="is-midium" />
            </span>
          </div>
          <br />
        </template>
        <span @click="addOption">
          <b-icon icon="plus" size="is-midium"></b-icon>{{$t("editMenu.itemAddOption")}}
        </span>
        <br />

        <!--
      <h4>
        Availability
      </h4>
      <b-field type="is-white">
        <b-select v-model="availability" placeholder="select">
          <option v-for="availItem in availOptions" :key="availItem">
            {{ availItem }}
          </option>
        </b-select>
      </b-field>
        -->
        <div style="margin-top:0.5rem;margin-bottom:1rem">
          <b-checkbox v-model="menuInfo.publicFlag">{{$t('shopInfo.public')}}</b-checkbox>
          <span style="color:#CB4B4B" v-if="menuInfo.publicFlag && hasError"><br/>
            {{$t("editMenu.itemInvalidMessage")}}
          </span>
        </div>

        <b-button
          style="margin-right:auto"
          type="is-primary"
          class="counter-button"
          expanded
          rounded
          @click="submitItem"
        >{{$t("editMenu.save")}}</b-button>
      </section>
    </template>
  </div>
</template>

<script>
import Vue from "vue";
import { db, storage } from "~/plugins/firebase.js";

import NotFound from "~/components/NotFound";
import BackButton from "~/components/BackButton";

const TAX_RATES = ["food", "alcohol"];

const AVAIL_OPTIONS = ["All day"];

export default {
  name: "Order",

  components: {
    BackButton,
    NotFound
  },

  data() {
    return {
      menuInfo: {
        itemName: "",
        price: 0,
        tax: "food",
        itemDescription: "",
        itemPhoto: "",
        // availability: "",
        publicFlag: false,
        itemOptionCheckbox: [""]
      },

      taxRates: TAX_RATES,
      availOptions: AVAIL_OPTIONS,
      croppa: {},

      restaurantInfo: {},
      notFound: null,
      menuId: this.$route.params.menuId
    };
  },
  async created() {
    this.checkAdminPermission();

    const restaurantRef = db.doc(`restaurants/${this.restaurantId()}`);
    const resRestInfo = await restaurantRef.get();
    if (!resRestInfo.exists) {
      this.notFound = true;
      console.log("no restaurant");
      return;
    }
    this.restaurantInfo = resRestInfo.data();

    if (this.restaurantInfo.uid !== this.uid) {
      this.notFound = true;
      console.log("no owner");
      return;
    }
    const menuRes = db.doc(
      `restaurants/${this.restaurantId()}/menus/${this.menuId}`
    );
    const resMenuInfo = await menuRes.get();
    if (!resMenuInfo.exists) {
      this.notFound = true;
      console.log("no menu");
      return;
    }
    this.menuInfo = Object.assign({}, this.menuInfo, resMenuInfo.data());

    this.notFound = false;
  },
  computed: {
    errors() {
      const err = {};
      ["itemName", "price", "tax"].forEach(name => {
        err[name] = [];
        if (this.menuInfo[name] === "") {
          err[name].push("validationError." + name + ".empty");
        }
      });
      err["itemDescription"] = [];
      return err;
    },
    uid() {
      return this.$store.getters.uidAdmin;
    },
    hasError() {
      const num = this.countObj(this.errors);
      return num > 0;
    }
  },
  methods: {
    deleteOption(pos) {
      this.menuInfo.itemOptionCheckbox.splice(pos, 1);
      // console.log(e);
    },
    addOption() {
      this.menuInfo.itemOptionCheckbox.push("");
    },
    async submitItem() {
      // if (this.hasError) return;

      //upload image
      const menuId = this.menuId;
      if (this.croppa.chosenFile) {
        let file = await this.croppa.promisedBlob("image/jpeg", 0.8);
        this.menuInfo.itemPhoto = await this.uploadFile(file, menuId);
      }
      const itemData = {
        itemName: this.menuInfo.itemName,
        price: Number(this.menuInfo.price),
        tax: this.menuInfo.tax,
        itemDescription: this.menuInfo.itemDescription,
        itemPhoto: this.menuInfo.itemPhoto,
        itemOptionCheckbox: this.menuInfo.itemOptionCheckbox || [],
        publicFlag: this.menuInfo.publicFlag || false,
        validatedFlag: !this.hasError
      };
      const newData = await db
        .doc(`restaurants/${this.restaurantId()}/menus/${this.menuId}`)
        .update(itemData);

      this.$router.push({
        path: `/admin/restaurants/${this.restaurantId()}/menus`
      });
    },
    uploadFile(file, menuId) {
      return new Promise((resolve, rejected) => {
        let storageRef = storage.ref();
        let mountainsRef = storageRef.child(
          `/images/restaurants/${this.restaurantId()}/menus/${menuId}/item.jpg`
        );
        let uploadTask = mountainsRef.put(file);

        uploadTask.on(
          "state_changed",
          snapshot => {},
          err => {
            this.loading = false;
          },
          () =>
            uploadTask.snapshot.ref
              .getDownloadURL()
              .then(downloadURL => resolve(downloadURL))
        );
      });
    },
    goBack() {
      this.$router.push({
        path: `/admin/restaurants/${this.restaurantId()}/menus`
      });
    }
  }
};
</script>
<style lang="scss" scoped>
.card_image {
  height: 200px;
}
.tax {
  margin-top: -2rem !important;
}
</style>
