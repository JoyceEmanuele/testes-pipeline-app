
export function isEmail(data: string){
    const mailRe = /^\S+@\S+\.\S+$/;
    return mailRe.test(data);
  }
  
export function isCNPJ(data: string){
  const CNPJRe = /^\d{2}[.-]?\.\d{3}[.-]?\.\d{3}[.-]?\/\d{4}[.-]?\-\d{2}$/ 
    return CNPJRe.test(data)
  }
  
export function isCPF(data: string){
  const CPFRe = /^\d{3}[.-]?\d{3}[.-]?\d{3}[.-]?\d{2}$/

    return CPFRe.test(data)
  }
  
export function isLocationNumber(data:string){
    const locationNumberRe = /^[0-9]{9}$/ 
    return locationNumberRe.test(data);
  }
  
export function isUsername(data: string) {
  //Deve conter ao menos uma letra
  const usernameRe = /^([a-zA-Z]{1,})[0-9a-zA-Z$*&@#]{3,50}$/
  return usernameRe.test(data) && data != null;
  }
  
export function isBirthdate(data: string){
  const birthdateRe = /^[0-9]{2}[\-/]{1}[0-9]{2}[\-/]{1}[0-9]{2,4}$/ 
  return birthdateRe.test(data);
  }

