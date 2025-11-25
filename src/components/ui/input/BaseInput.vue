<template>
  <div class="flex flex-col space-y-1">
    <label
      v-if="label"
      :for="id"
      class="text-sm font-medium text-text-secondary"
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
        'px-3 py-2 rounded border w-full text-sm focus:outline-none bg-surface-base text-text-primary border-border-subtle focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base',
        props.class,
        error
          ? 'border-status-danger text-status-danger bg-status-danger/12'
          : '',
      ]"
      v-model="internalValue"
      :aria-describedby="error ? errorId : undefined"
      :aria-invalid="!!error"
      :required="required"
    />

    <p
      v-if="error"
      :id="errorId"
      class="text-sm text-status-danger"
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
