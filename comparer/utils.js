export const comparer = (products,JDLaunchProduct)=> {
    let find= false;
    let diff=[]
    for (let index = 0; index < products.length; index++) {
        const element = products[index];
        for (let idx = 0; idx < JDLaunchProduct.length; idx++) {
            const ele = JDLaunchProduct[idx];
            if ( element.product_name == ele.product_name && element.link == ele.link && element.picture == ele.picture && element.end == ele.end){
                find=true;
            }
        }
        if (!find)
            diff.push(element)
        else
            find = false
    }
    return diff;
}