<template>
  <section class="section">
    <back-button :url="parentUrl" />
    <div>
      <div style="float:left">
        <h2>{{ orderName }}</h2>
        <div>
          <span>{{ $n(orderInfo.totalCharge, 'currency') }}</span>
          <i
            v-if="hasStripe"
            :class="'fab fa-cc-stripe stripe_'+orderInfo.payment.stripe"
            style="margin-left: 0.3em"
          ></i>
        </div>
      </div>
      <div style="float:right" v-if="!canceling">
        <b-button
          type="is-danger"
          :disabled="!isValidTransition('order_canceled')"
          @click="canceling=true"
        >{{ $t("admin.order.cancelButton" )}}</b-button>
      </div>
      <div style="clear:both" />
    </div>
    <div style="margin-bottom:1rem">
      <div v-if="canceling">
        <div class="message-box">
          <div style="width:100%">
            <div style="float:right; width:2.5em;height:1px">
              <b-button style="position:abolute;border:none;top:-0.5rem" @click="canceling=false">
                <i class="fa fa-times-circle gray-icon" />
              </b-button>
            </div>
            <div style="clear:both" />
          </div>
          <h3>{{$t("admin.order.cancelTitle")}}</h3>
          <p>{{$t("admin.order.cancelMessage")}}</p>
          <p>
            <span>{{orderInfo.name }}</span>
            <a :href="nationalPhoneURI">{{ nationalPhoneNumber }}</a>
          </p>
        </div>
        <div style="margin:0.2rem">
          <b-button
            type="is-danger"
            style="width:100%"
            class="light"
            :loading="updating==='order_canceled'"
            @click="handleCancel"
          >{{ $t("admin.order.delete") }}</b-button>
        </div>
      </div>
      <div v-else>
        <p v-if="orderInfo.phoneNumber" style="margin-bottom:1rem">
          <span>{{orderInfo.name }}</span>
          <a :href="nationalPhoneURI">{{ nationalPhoneNumber }}</a>
        </p>
      </div>
      <div v-for="orderState in orderStates" style="margin:0.2rem" :key="orderState">
        <b-button
          :class="classOf(orderState)"
          :loading="updating===orderState"
          :disabled="!isValidTransition(orderState)"
          style="width:100%"
          @click="handleChangeStatus(orderState)"
        >{{ $t("order.status." + orderState) }}</b-button>
      </div>
      <div style="margin:0.2rem">
        <b-button
          :class="classOf('customer_picked_up')"
          :loading="updating==='customer_picked_up'"
          :disabled="!isValidTransition('customer_picked_up')"
          style="width:100%"
          @click="handleComplete()"
        >{{ $t("order.status." + 'customer_picked_up') }}</b-button>
      </div>
    </div>
    <ordered-item v-for="id in ids" :key="id" :item="items[id]" />
  </section>
</template>

<script>
import { db, functions } from "~/plugins/firebase.js";
import BackButton from "~/components/BackButton";
import OrderedItem from "~/app/admin/Order/OrderedItem";
import { order_status } from "~/plugins/constant.js";
import { nameOfOrder } from "~/plugins/strings.js";
import { parsePhoneNumber, formatNational } from "~/plugins/phoneutil.js";
import { stripeConfirmIntent, stripeCancelIntent } from "~/plugins/stripe.js";
import moment from "moment";

export default {
  components: {
    BackButton,
    OrderedItem
  },

  data() {
    return {
      orderStates: ["order_placed", "order_accepted", "cooking_completed"],
      updating: "",
      shopInfo: {},
      menuObj: {},
      orderInfo: {},
      canceling: false,
      detacher: []
    };
  },
  created() {
    const restaurant_detacher = db
      .doc(`restaurants/${this.restaurantId()}`)
      .onSnapshot(restaurant => {
        if (restaurant.exists) {
          const restaurant_data = restaurant.data();
          this.shopInfo = restaurant_data;
        }
      });
    const menu_detacher = db
      .collection(`restaurants/${this.restaurantId()}/menus`)
      .onSnapshot(menu => {
        if (!menu.empty) {
          const menuList = menu.docs.map(this.doc2data("menu"));
          this.menuObj = this.array2obj(menuList);
        }
      });
    const order_detacher = db
      .doc(`restaurants/${this.restaurantId()}/orders/${this.orderId}`)
      .onSnapshot(order => {
        if (order.exists) {
          const order_data = order.data();
          this.orderInfo = order_data;
        }
      });
    this.detacher = [restaurant_detacher, menu_detacher, order_detacher];
  },
  destroyed() {
    this.detacher.map(detacher => {
      detacher();
    });
  },
  computed: {
    hasStripe() {
      return this.orderInfo.payment && this.orderInfo.payment.stripe;
    },
    phoneNumber() {
      return (
        this.orderInfo &&
        this.orderInfo.phoneNumber &&
        parsePhoneNumber(this.orderInfo.phoneNumber)
      );
    },
    nationalPhoneNumber() {
      return formatNational(this.phoneNumber);
    },
    nationalPhoneURI() {
      return "tel:" + this.phoneNumber.getNationalNumber();
    },
    orderName() {
      return nameOfOrder(this.orderInfo);
    },
    ids() {
      return this.orderInfo.order ? Object.keys(this.orderInfo.order) : [];
    },
    count() {
      return this.ids ? this.ids.length : 0;
    },
    orderId() {
      return this.$route.params.orderId;
    },
    parentUrl() {
      const day = this.orderInfo.timePlaced
        ? moment(this.orderInfo.timePlaced.toDate()).format("YYYY-MM-DD")
        : null;
      return `/admin/restaurants/${this.restaurantId()}/orders?day=${day}`;
    },
    items() {
      return Object.keys(this.orderInfo.order).reduce((ret, id) => {
        ret[id] = {
          count: this.orderInfo.order[id],
          option: this.specialRequest(id),
          menu: this.menuObj[id]
        };
        return ret;
      }, {});
    }
  },
  methods: {
    possibleTransition() {
      switch (this.orderInfo.status) {
        case order_status.order_placed:
          return {
            order_accepted: true,
            cooking_completed: true,
            order_canceled: true
          };
        case order_status.order_accepted:
          return {
            cooking_completed: true,
            order_canceled: true
          };
        case order_status.cooking_completed:
          return {
            order_accepted: true,
            order_canceled: true,
            customer_picked_up: true // both paid and unpaid
          };
        case order_status.customer_picked_up:
          return {
            order_refunded: true
          };
      }
      return {};
    },
    isValidTransition(newStatus) {
      return (
        this.possibleTransition()[newStatus] ||
        (order_status[newStatus] === this.orderInfo.status &&
          newStatus !== "order_canceled")
      );
    },
    // NOTE: Exact same code in the order/_orderId/index.vue for the user.
    // This is intentional because we may want to present it differently to admins.
    specialRequest(key) {
      const option = this.orderInfo.options && this.orderInfo.options[key];
      if (option) {
        return option.filter(choice => choice).join(", ");
      }
      return "";
    },
    async handleComplete() {
      if (this.hasStripe) {
        const orderId = this.$route.params.orderId;
        //console.log("handleComplete with Stripe", orderId);
        try {
          this.updating = "customer_picked_up";
          const { data } = await stripeConfirmIntent({
            restaurantId: this.restaurantId(),
            orderId
          });
          console.log("confirm", data);
          this.$router.push(this.parentUrl);
        } catch (error) {
          console.error(error.message, error.details);
        } finally {
          this.updating = "";
        }
      } else {
        this.handleChangeStatus("customer_picked_up");
      }
    },
    async handleChangeStatus(statusKey) {
      const newStatus = order_status[statusKey];
      if (newStatus === this.orderInfo.status) {
        return;
      }
      const orderUpdate = functions.httpsCallable("orderUpdate");
      this.updating = statusKey;
      try {
        const { data } = await orderUpdate({
          restaurantId: this.restaurantId(),
          orderId: this.orderId,
          status: newStatus
        });
        console.log("update", data);
        this.$router.push(this.parentUrl);
      } catch (error) {
        // BUGBUG: Handle Error
        console.error(error.message, error.details);
      } finally {
        this.updating = "";
      }
    },
    async handleCancel() {
      console.log("handleCancel");
      try {
        this.updating = "order_canceled";
        const { data } = await stripeCancelIntent({
          restaurantId: this.restaurantId(),
          orderId: this.orderId
        });
        console.log("cancel", data);
        this.$router.push(this.parentUrl);
      } catch (error) {
        // BUGBUG: Implement the error handling code here
        console.error(error.message, error.details);
      } finally {
        this.updating = "";
      }
    },
    classOf(statusKey) {
      if (order_status[statusKey] == this.orderInfo.status) {
        return statusKey;
      }
      return "light";
    }
  }
};
</script>

<style lang="scss">
.light {
  background: $light;
  border: none;
}
.message-box {
  border: 1px #dddddd solid;
  border-radius: 5px;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: white;
  text-align: center;
}
.gray-icon {
  color: $grey;
}
</style>
