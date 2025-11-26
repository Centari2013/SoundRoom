<template>
  <div class="flex flex-col space-y-1">
    <label
      v-if="label"
      :for="id"
      class="text-sm font-medium text-[var(--color-text-secondary)]"
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
        'px-3 py-2 rounded sr-border sr-border-subtle w-full text-sm focus:outline-none bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-surface)]',
        props.class,
        error
          ? 'border-status-danger text-[var(--color-danger)] bg-[rgba(var(--color-danger-rgb),0.12)]'
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
      class="text-sm text-[var(--color-danger)]"
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
