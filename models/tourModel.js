const mongoose = require("mongoose");
const slugify = require("slugify");
const validator = require("validator");

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Tour must have a name"],
        unique: true,
        trim: true,
        maxlength: [40, "A Tour must have length less than or equal to 40"],
        minlength: [10, "A Tour length must be greater than or equal to 10"]
        // validate: [validator.isAlpha, "Tour name must only contain characters"]//gives space error
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, "A Tour must have a duration"]
    },
    maxGroupSize: {
        type: Number,
        required: [true, "A Tour must have a group size"]
    },
    difficulty: {
        type: String,
        required: [true, "A Tour must have a difficulty"],
        enum: {
            values: ["easy", "medium", "hard"],
            message: "Difficulty is either: easy, medium, difficult"
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, "tour rating avg should be more than 1.0"],
        max: [5, "tour rating avg mjust be less than 5.0"]
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, "Tour must have a price"]
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function(val) {
                //this keyword points to current doc on NEW Doc creation but NOT on update
                return val < this.price;
            },
            message: "Discount price ({VALUE}) should be below regular price"
        } 
    },
    summary: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, "A tour must have a cover image"]
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    }
    }, 
    {
    toJSON: { virtuals: true},//to convert virtual property "durationWeeks" to JSON
    toObject: { virtuals: true}// to convert virtual property "durationWeeks" in object form like others above
    }
);

//mongoose virtual property => doesnt get saved in DB
tourSchema.virtual("durationWeeks").get(function () {
    return this.duration / 7;//duration week for duration of every tour
})

//DOCUMENT MIDDLEWARE: RUNS BEFORE .save() AND .create() BUT NOT ON .insertMany()
tourSchema.pre("save", function (next) {
    // console.log(this);
    this.slug = slugify(this.name, { lower: true});//lowercase form
    next();
})

//ALSO CALLED PRE SAVE HOOK / MIDDLEWARE
// tourSchema.pre("save", function (next) {
//     console.log("will save document...");
//     next();
// })

// //POST SAVE HOOK OR POST SAVE MIDDLEWARE
// tourSchema.post("save", function (doc, next) {//doc saved
//     console.log(doc);
//     next();
// })

tourSchema.pre(/^find/, function (next) {
    this.find({ secretTour: { $ne: true}})
    
    this.start = Date.now();
    next();
})

tourSchema.post(/^find/, function (docs, next) {//docs found through find() query
    console.log(`Query took ${Date.now() - this.start} miliseconds`);
    // console.log(docs);
    next();
});

//AGGREGATION MIDDLEWARE:
tourSchema.pre("aggregate", function(next) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true}}})
    console.log(this.pipeline());
    next();
})

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;