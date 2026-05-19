<script setup lang="ts">
import { computed, ref } from "vue";
import {
  FilterSensitiveWord,
  type DetectType,
} from "filter-sensitive-word";

const text = ref("这是兼职广 告，欢迎加微店");

const typeOptions: { value: DetectType; label: string }[] = [
  { value: "politics", label: "政治" },
  { value: "ads", label: "广告" },
  { value: "porn", label: "色情" },
  { value: "violence", label: "暴恐" },
  { value: "cult", label: "邪教" },
  { value: "abuse", label: "辱骂" },
];

const selectedTypes = ref<DetectType[]>(typeOptions.map((t) => t.value));

const filter = computed(
  () =>
    new FilterSensitiveWord({
      detectTypes: selectedTypes.value.length
        ? selectedTypes.value
        : undefined,
    }),
);

const hasSensitive = computed(() => filter.value.hasSensitive(text.value));
const filtered = computed(() => filter.value.filter(text.value));
const found = computed(() => filter.value.findAll(text.value));

const samples = [
  "这是正常文本",
  "这是兼职广 告",
  "兼***职",
  "JianZhi 招聘",
];

function toggleType(type: DetectType, checked: boolean) {
  if (checked) {
    if (!selectedTypes.value.includes(type)) {
      selectedTypes.value = [...selectedTypes.value, type];
    }
  } else {
    selectedTypes.value = selectedTypes.value.filter((t) => t !== type);
  }
}
</script>

<template>
  <div class="playground">
    <div class="playground__types">
      <label v-for="opt in typeOptions" :key="opt.value">
        <input
          type="checkbox"
          :checked="selectedTypes.includes(opt.value)"
          @change="
            toggleType(opt.value, ($event.target as HTMLInputElement).checked)
          "
        />
        {{ opt.label }}
      </label>
    </div>

    <textarea v-model="text" placeholder="输入待检测文本…" />

    <div class="playground__toolbar">
      <button
        v-for="(sample, i) in samples"
        :key="i"
        type="button"
        @click="text = sample"
      >
        示例 {{ i + 1 }}
      </button>
    </div>

    <dl class="playground__results">
      <div class="playground__card">
        <dt>hasSensitive</dt>
        <dd :class="hasSensitive ? 'is-hit' : 'is-safe'">
          {{ hasSensitive }}
        </dd>
      </div>
      <div class="playground__card">
        <dt>filter()</dt>
        <dd>{{ filtered }}</dd>
      </div>
      <div class="playground__card">
        <dt>findAll()</dt>
        <dd>{{ found.length ? found.join("、") : "[]" }}</dd>
      </div>
    </dl>
  </div>
</template>
