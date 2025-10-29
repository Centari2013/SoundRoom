<template>
  <div class="flex flex-col space-y-1">
    <label
      v-if="label"
      :for="id"
      class="text-sm font-medium text-primary"
    >
      {{ label }}
    </label>

    <input
      :name="name"
      :id="id"
      :type="type"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :class="[
        'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-accent/40 transition shadow-sm',
        props.class,
        error
          ? 'border-red-500 text-red-700 bg-red-50'
          : 'border-border bg-panel text-primary',
      ]"
      v-model="internalValue"
      :aria-describedby="error ? errorId : undefined"
      :aria-invalid="!!error"
      :required="required"
    />

    <p
      v-if="error"
      :id="errorId"
      class="text-sm text-red-600"
      role="alert"
      aria-live="assertive"
    >
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  name: String,
  type: {
    type: String,
    default: 'text',
  },
  placeholder: String,
  autocomplete: {
    type: String,
    default: '',
  },
  disabled: Boolean,
  error: String,
  id: {
    type: String,
    default: () => `input-${Math.random().toString(36).substring(2, 10)}`,
  },
  required: Boolean,
  class: {
    type: [String, Array, Object],
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const errorId = computed(() => `${props.id}-error`)

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})
</script>
