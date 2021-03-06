<template>
  <div class="card block">
    <template v-for="orderItem in orderItems">
      <order-item
        :item="orderItem.item"
        :count="orderItem.count"
        :specialRequest="orderItem.specialRequest"
        :key="orderItem.key"
      ></order-item>
    </template>

    <hr class="hr-black" />

    <div v-if="verified">
      <div class="card-content subtotal">
        <div class="media">
          <div class="media-content">
            <h4 class="bold">{{$t('order.subtotal')}}</h4>
          </div>
          <div class="media-right" style="margin-top:-0.4rem;">
            <p class="p-bold">{{$n(orderInfo.sub_total, 'currency')}}</p>
          </div>
        </div>
      </div>

      <div class="card-content tax">
        <div class="media">
          <div class="media-content">
            <h4 class="bold">{{$t('order.salesTax')}}</h4>
          </div>
          <div class="media-right" style="margin-top:-0.4rem;">
            <p class="p-bold">{{$n(orderInfo.tax, 'currency')}}</p>
          </div>
        </div>
      </div>
      <div class="card-content tax">
        <div class="media">
          <div class="media-content">
            <h4 class="bold">{{$t('order.total')}}</h4>
          </div>
          <div class="media-right" style="margin-top:-0.4rem;">
            <p class="p-bold">{{$n(orderInfo.total, 'currency')}}</p>
          </div>
        </div>
      </div>

      <div class="card-content">
        <div class="media">
          <div class="media-content">
            <b-field :label="$t('order.tip')">
              <div v-if="isTipEditable">
                <div style="margin-right:1em; float:left; width:6em">
                  <b-input
                    type="number"
                    step=".01"
                    v-model="tip"
                    v-on:input="handleTipInput"
                    maxlength="30"
                    style
                  />
                </div>
                <b-button
                  v-for="ratio in [10, 15,18,20]"
                  @click="updateTip(ratio)"
                  :type="isSameAmount(ratio) ? 'is-primary' : ''"
                  :key="ratio"
                  size="is-small"
                >{{ ratio + "%" }}</b-button>
                <div style="clear:both" />
              </div>
            </b-field>
          </div>
          <div class="media-right" style="margin-top:-0.4rem;">
            <p class="p-bold">{{$n(tip, 'currency')}}</p>
          </div>
        </div>
      </div>

      <div class="card-content">
        <div class="media">
          <div class="media-content">
            <h3 class="bold">{{$t('order.totalCharge')}}</h3>
          </div>
          <div class="media-right">
            <p
              class="p-big bold"
              style="color:#CB4B4B"
            >{{$n(orderInfo.total + Number(tip), 'currency')}}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { order_status } from "~/plugins/constant.js";
import OrderItem from "~/app/user/Order/OrderItem";

export default {
  name: "Order",

  props: {
    orderItems: {
      type: Array,
      required: true
    },
    orderInfo: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      tip: 0
    };
  },
  watch: {
    orderInfo() {
      //console.log("orderInfo changed", this.orderInfo.total);
      if (this.isTipEditable) {
        this.updateTip(15);
      } else {
        this.tip = this.orderInfo.tip;
      }
    }
  },
  components: {
    OrderItem
  },
  computed: {
    verified() {
      return this.orderInfo.status >= order_status.validation_ok;
    },
    isTipEditable() {
      return this.orderInfo.status === order_status.validation_ok;
    }
  },
  methods: {
    calcTip(ratio) {
      const value = Math.round(this.orderInfo.total * ratio) / 100;
      return value.toLocaleString(undefined, { minimumFractionDigits: 2 });
    },
    updateTip(ratio) {
      this.tip = this.calcTip(ratio);
      this.$emit("change", Number(this.tip));
    },
    isSameAmount(ratio) {
      return this.tip === this.calcTip(ratio);
    },
    handleTipInput() {
      //console.log("tip=", this.tip);
      if (this.tip < 0) {
        console.log("native");
        this.tip = -this.tip;
      }
      this.$emit("change", Number(this.tip));
    }
  }
};
</script>
<style type="scss" scped>
.tax {
  margin-top: -1.6rem !important;
}
</style>
