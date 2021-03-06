<template>
  <div>
    <template v-if="notFound==null"></template>
    <template v-else-if="notFound">
      <not-found />
    </template>
    <template v-else>
      <!-- menu-image -->
      <div
        id="menu-header-image"
        :style="{ backgroundImage: 'url(' + shopInfo.restCoverPhoto + ')' }"
      >
        <div id="menu-header-image-mask"></div>
      </div>
      <!-- shop-orner -->
      <section class="section">
        <shop-orner-info
          v-if="shopInfo.restaurantName"
          :src="shopInfo.restProfilePhoto"
          :name="shopInfo.restaurantName"
        ></shop-orner-info>
        <b-tabs size="is-medium" class="block" expanded v-model="tabIndex">
          <b-tab-item :label="$t('sitemenu.menu')">
            <template v-for="itemId in menuLists">
              <div v-if="itemsObj[itemId]" :key="itemId">
                <h2 v-if="itemsObj[itemId]._dataType === 'title'">{{itemsObj[itemId].name}}</h2>
                <item-card
                  v-if="itemsObj[itemId]._dataType === 'menu'"
                  :item="itemsObj[itemId]"
                  :count="orders[itemId] || 0"
                  :optionPrev="optionsPrev[itemId]"
                  :initialOpenMenuFlag="(orders[itemId] || 0) > 0"
                  @didCountChange="didCountChange($event)"
                  @didOptionValuesChange="didOptionValuesChange($event)"
                ></item-card>
              </div>
            </template>
            <hr class="hr-black" />
          </b-tab-item>
          <b-tab-item :label="$t('sitemenu.about')">
            <shop-info v-bind:shopInfo="shopInfo" v-if="shopInfo.publicFlag"></shop-info>
          </b-tab-item>
        </b-tabs>

        <b-modal :active.sync="loginVisible" :width="640">
          <div class="card">
            <div class="card-content">
              <phone-login v-on:dismissed="handleDismissed" />
            </div>
          </div>
        </b-modal>
      </section>
      <div>
        <button
          v-if="0 != totalCount"
          id="order_btn"
          class="button is-primary is-rounded"
          :loading="isCheckingOut"
          @click="handleCheckOut"
        >
          <span
            style="margin-right: auto;"
          >{{$tc('sitemenu.orderCounter', totalCount, {count: totalCount})}}</span>
          <span class="bold" style="margin-left:auto;">{{$t('sitemenu.checkout')}}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script>
import ItemCard from "~/app/user/Restaurant/ItemCard";
import PhoneLogin from "~/app/auth/PhoneLogin";
import ShopOrnerInfo from "~/app/user/Restaurant/ShopOrnerInfo";
import ShopInfo from "~/app/user/Restaurant/ShopInfo";
import NotFound from "~/components/NotFound";

import { db, firestore } from "~/plugins/firebase.js";
import { order_status } from "~/plugins/constant.js";

export default {
  name: "ShopMenu",

  components: {
    ItemCard,
    PhoneLogin,
    ShopOrnerInfo,
    ShopInfo,
    NotFound
  },
  data() {
    return {
      tabIndex: 0,
      tabs: ["#menus", "#about"],
      loginVisible: false,
      isCheckingOut: false,
      orders: {},
      options: {},
      optionsPrev: {}, // from the store.cart
      restaurantsId: this.restaurantId(),
      shopInfo: {},
      // isCardModalActive: false
      menus: [],
      titles: [],
      waitForUser: false,

      detacher: [],
      notFound: null
    };
  },
  mounted() {
    const index = this.tabs.findIndex(tab => tab === this.$route.hash);
    if (index > -1) {
      this.tabIndex = index;
    }

    // Check if we came here as the result of "Edit Items"
    const url = new URL(window.location.href);
    if (url.hash.length > 1) {
      const prevOrderId = url.hash.slice(1);
      const cart = this.$store.state.carts[prevOrderId] || {};
      //console.log("cart", cart);
      this.orders = cart.orders || {};
      this.optionsPrev = cart.options || {};
    }
  },
  created() {
    const restaurant_detacher = db
      .doc(`restaurants/${this.restaurantId()}`)
      .onSnapshot(restaurant => {
        if (
          restaurant.exists &&
          !restaurant.data().deletedFlag &&
          restaurant.data().publicFlag
        ) {
          const restaurant_data = restaurant.data();
          this.shopInfo = restaurant_data;
          this.notFound = false;
        } else {
          this.notFound = true;
        }
      });
    const menu_detacher = db
      .collection(`restaurants/${this.restaurantId()}/menus`)
      .where("deletedFlag", "==", false)
      .where("publicFlag", "==", true)
      .onSnapshot(menu => {
        if (!menu.empty) {
          this.menus = menu.docs
            .filter(a => {
              const data = a.data();
              return data.validatedFlag === undefined || data.validatedFlag;
            })
            .map(this.doc2data("menu"));
        }
      });
    const title_detacher = db
      .collection(`restaurants/${this.restaurantId()}/titles`)
      .onSnapshot(title => {
        if (!title.empty) {
          this.titles = title.docs.map(this.doc2data("title"));
        }
      });
    this.detacher = [restaurant_detacher, menu_detacher, title_detacher];
  },
  destroyed() {
    if (this.detacher) {
      this.detacher.map(detacher => {
        detacher();
      });
    }
  },
  watch: {
    tabIndex() {
      this.$router.push(this.tabs[this.tabIndex]);
    },
    user(newValue) {
      console.log("user changed");
      if (this.waitForUser && newValue) {
        console.log("handling deferred notification");
        this.goCheckout();
      }
    }
  },
  computed: {
    totalCount() {
      const ret = Object.keys(this.orders).reduce((total, id) => {
        return total + this.orders[id];
      }, 0);
      return ret;
    },
    itemsObj() {
      return this.array2obj(this.menus.concat(this.titles));
    },
    menuLists() {
      const list = this.shopInfo.menuLists || [];
      return list;
    },
    user() {
      return this.$store.state.user;
    },
    trimmedOptions() {
      return Object.keys(this.orders).reduce((ret, id) => {
        ret[id] = this.options[id];
        return ret;
      }, {});
    }
  },
  methods: {
    handleCheckOut() {
      // The user has clicked the CheckOut button
      if (this.user && this.user.phoneNumber) {
        this.goCheckout();
      } else {
        this.loginVisible = true;
      }
    },
    handleDismissed() {
      // The user has dismissed the login dialog (including the successful login)
      this.loginVisible = false;
      if (this.user) {
        this.goCheckout();
      } else {
        console.log("this.user it not ready yet");
        this.waitForUser = true;
      }
    },
    async goCheckout() {
      const order_data = {
        order: this.orders,
        options: this.trimmedOptions,
        status: order_status.new_order,
        uid: this.user.uid,
        phoneNumber: this.user.phoneNumber,
        name: this.$store.getters.name,
        timeCreated: firestore.FieldValue.serverTimestamp()
        // price never set here.
      };
      this.isCheckingOut = true;
      try {
        const res = await db
          .collection(`restaurants/${this.restaurantId()}/orders`)
          .add(order_data);
        // Store the current order associated with this order id, so that we can re-use it
        // when the user clicks the "Edit Items" on the next page.
        // In that case, we will come back here with #id so that we can retrieve it (see mounted).
        this.$store.commit("saveCart", {
          id: res.id,
          cart: {
            orders: this.orders,
            options: this.options
          }
        });
        this.$router.push({
          path: `/r/${this.restaurantId()}/order/${res.id}`
        });
      } catch (error) {
        console.log(error);
      } finally {
        this.isCheckingOut = true;
      }
    },
    didCountChange(eventArgs) {
      // NOTE: We need to assign a new object to trigger computed properties
      const obj = {};
      obj[eventArgs.id] = eventArgs.count;
      this.orders = Object.assign({}, this.orders, obj);
    },
    didOptionValuesChange(eventArgs) {
      const obj = {};
      obj[eventArgs.id] = eventArgs.optionValues.map((option, index) => {
        if (option === true) {
          if (this.itemsObj[eventArgs.id].itemOptionCheckbox) {
            return this.itemsObj[eventArgs.id].itemOptionCheckbox[index];
          }
        } else if (option === false) {
          return "";
        }
        return option;
      });
      this.options = Object.assign({}, this.options, obj);
      //console.log(this.options);
    }
  }
};
</script>
<style lang="scss" scoped>
#menu-header-image {
  width: 100%;
  height: 200px;
  padding: initial !important;
  background-repeat: no-repeat;
  background-size: cover;
  position: relative;
}
// #menu-header-image-mask {
//   background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4), #fff 50%)!important;
// }

#order_btn {
  position: fixed;
  /*基準を画面の左上に*/
  bottom: 1rem;
  /*余白が入らないように*/
  /*以下装飾*/
  width: 90%;
  left: 50%;
  transform: translate(-50%, 0);
  margin-left: auto;
  margin-right: auto;
  // background: #FFC778;
  color: white;
  height: 3rem;
}
</style>
<style>
.tab-content {
  margin-left: calc(((100vw - 100%) / 2) * -1) !important;
  margin-right: calc(((100vw - 100%) / 2) * -1) !important;
}
</style>
