<template>
  <div class="relative w-full">
    <BaseInput
      v-bind="inputProps"
      :type="show ? 'text' : 'password'"
      v-model="internalValue"
    />
    <BaseButton
      class="absolute right-1 top-1/2 -translate-y-1/2 eye-button"
      @click.prevent="show = !show"
      :aria-label="show ? 'Hide password' : 'Show password'"
    >
      <component :is="show ? EyeOpen : EyeClosed" class="w-5 h-5 text-gray-500 dark:text-neutral-900" />
    </BaseButton>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseInput from './BaseInput.vue'
import BaseButton from '@/components/ui/input/BaseButton.vue'
import EyeOpen from '@/assets/icons/eyeOpen.svg'
import EyeClosed from '@/assets/icons/eyeClosed.svg'

const props = defineProps({
  modelValue: String,
  // Allow all props that BaseInput supports to be passed through
  id: String,
  placeholder: String,
  autocomplete: String,
  disabled: Boolean,
  error: String,
  label: String,
  required: Boolean,
})

const emit = defineEmits(['update:modelValue'])

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const show = ref(false)

const inputProps = computed(() => ({
  ...props,
  type: undefined // override actual `type` via `:type="show ? 'text' : 'password'"`
}))
</script>
